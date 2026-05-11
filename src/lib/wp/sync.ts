import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog, urls } from "@/lib/db/schema";
import { getSiteWithSecret } from "@/lib/sites/queries";
import { wpFetch } from "@/lib/wp/client";
import { listSyncablePostTypes } from "@/lib/wp/post-types";
import { decodeEntities, stripHtml } from "@/lib/wp/text";

export type SyncResult = {
  fetched: number;
  matched: number;
  unmatched: number;
  perType: Record<string, { fetched: number; matched: number }>;
  durationMs: number;
};

function asExcerpt(post: WpPost): string | null {
  const raw = post.excerpt?.rendered?.trim() ?? "";
  if (!raw) return null;
  const cleaned = stripHtml(decodeEntities(raw));
  if (!cleaned) return null;
  return cleaned.slice(0, 1000);
}

type WpPost = {
  id: number;
  slug?: string;
  link: string;
  type: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
  meta?: Record<string, unknown>;
  sitemapseo_translations?: {
    trid: string;
    siblings: Record<string, number> | Record<string, never>;
  } | null;
};

async function fetchPostsOfTypeForLang(
  site: Awaited<ReturnType<typeof getSiteWithSecret>>,
  restBase: string,
  lang: string | null,
): Promise<WpPost[]> {
  if (!site) return [];
  const collected: WpPost[] = [];
  let page = 1;
  const langParam = lang ? `&lang=${lang}` : "";
  for (;;) {
    const res = await wpFetch(
      site,
      `/wp/v2/${restBase}?per_page=100&page=${page}&context=edit&_fields=id,slug,link,type,title,excerpt,meta,sitemapseo_translations${langParam}`,
      { timeoutMs: 60_000 },
    );
    if (res.status === 400 || res.status === 404) {
      break;
    }
    if (!res.ok) {
      throw new Error(`WP ${restBase} p${page} lang=${lang ?? "*"}: ${res.status}`);
    }
    const totalPagesHeader = res.headers.get("x-wp-totalpages");
    const totalPages = totalPagesHeader ? Number(totalPagesHeader) : 1;
    const batch = (await res.json()) as WpPost[];
    if (Array.isArray(batch)) {
      collected.push(...batch);
    }
    if (!totalPages || page >= totalPages || batch.length === 0) break;
    page += 1;
  }
  return collected;
}

async function fetchAllPostsOfType(
  site: Awaited<ReturnType<typeof getSiteWithSecret>>,
  restBase: string,
  languages: string[],
): Promise<WpPost[]> {
  if (!site) return [];
  const seen = new Set<number>();
  const out: WpPost[] = [];

  if (languages.length === 0) {
    const batch = await fetchPostsOfTypeForLang(site, restBase, null);
    for (const p of batch) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
    return out;
  }

  for (const lang of languages) {
    const batch = await fetchPostsOfTypeForLang(site, restBase, lang);
    for (const p of batch) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
  }
  return out;
}

function metaString(meta: Record<string, unknown> | undefined, key: string): string | null {
  const v = meta?.[key];
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function syncSiteFromWp(siteId: string): Promise<SyncResult> {
  const started = Date.now();
  const site = await getSiteWithSecret(siteId);
  if (!site) {
    throw new Error("Site nicht gefunden");
  }

  const postTypes = await listSyncablePostTypes(site);

  const existing = await db
    .select({ id: urls.id, url: urls.url, status: urls.status })
    .from(urls)
    .where(eq(urls.siteId, siteId));
  const urlToRow = new Map(existing.map((r) => [r.url, r]));

  let fetchedTotal = 0;
  let matchedTotal = 0;
  const perType: SyncResult["perType"] = {};

  type Update = {
    id: string;
    wpPostId: number;
    postType: string;
    title: string | null;
    contentExcerpt: string | null;
    currentSeoTitle: string | null;
    currentMetaDesc: string | null;
    currentFocusKeyword: string | null;
    currentMetaRobotsNoindex: boolean;
    currentMetaRobotsNofollow: boolean;
    translationGroupId: string | null;
    nextStatus: "pending" | "optimized";
  };
  const updates: Update[] = [];

  function metaBool(meta: Record<string, unknown> | undefined, key: string): boolean {
    const v = meta?.[key];
    if (v === true || v === "1" || v === 1 || v === "true") return true;
    return false;
  }

  for (const pt of postTypes) {
    let posts: WpPost[] = [];
    try {
      posts = await fetchAllPostsOfType(site, pt.restBase, site.languages);
    } catch (err) {
      console.warn(
        `[wp-sync] ${pt.restBase} failed: ${(err as Error).message}`,
      );
    }
    let matchedPerType = 0;
    for (const post of posts) {
      const existingRow = urlToRow.get(post.link);
      if (!existingRow) continue;
      if (
        existingRow.status !== "pending" &&
        existingRow.status !== "optimized"
      ) {
        continue;
      }
      const seoTitle = metaString(post.meta, "_yoast_wpseo_title");
      const metaDesc = metaString(post.meta, "_yoast_wpseo_metadesc");
      const focusKw = metaString(post.meta, "_yoast_wpseo_focuskw");
      const robotsNoindex = metaBool(post.meta, "_yoast_wpseo_meta-robots-noindex");
      const robotsNofollow = metaBool(post.meta, "_yoast_wpseo_meta-robots-nofollow");
      const trid = post.sitemapseo_translations?.trid ?? null;
      const nextStatus: Update["nextStatus"] =
        seoTitle && metaDesc ? "optimized" : "pending";

      updates.push({
        id: existingRow.id,
        wpPostId: post.id,
        postType: pt.slug,
        title: post.title?.rendered
          ? decodeEntities(stripHtml(post.title.rendered)).slice(0, 500)
          : null,
        contentExcerpt: asExcerpt(post),
        currentSeoTitle: seoTitle,
        currentMetaDesc: metaDesc,
        currentFocusKeyword: focusKw,
        currentMetaRobotsNoindex: robotsNoindex,
        currentMetaRobotsNofollow: robotsNofollow,
        translationGroupId: trid,
        nextStatus,
      });
      matchedPerType += 1;
    }
    fetchedTotal += posts.length;
    matchedTotal += matchedPerType;
    perType[pt.slug] = { fetched: posts.length, matched: matchedPerType };
  }

  const now = new Date();
  const CHUNK = 50;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const slice = updates.slice(i, i + CHUNK);
    await Promise.all(
      slice.map((u) =>
        db
          .update(urls)
          .set({
            wpPostId: u.wpPostId,
            postType: u.postType,
            title: u.title,
            contentExcerpt: u.contentExcerpt,
            currentSeoTitle: u.currentSeoTitle,
            currentMetaDesc: u.currentMetaDesc,
            currentFocusKeyword: u.currentFocusKeyword,
            currentMetaRobotsNoindex: u.currentMetaRobotsNoindex,
            currentMetaRobotsNofollow: u.currentMetaRobotsNofollow,
            translationGroupId: u.translationGroupId,
            lastSyncedAt: now,
            status: u.nextStatus,
          })
          .where(eq(urls.id, u.id)),
      ),
    );
  }

  const unmatched = fetchedTotal - matchedTotal;
  const durationMs = Date.now() - started;

  await db.insert(activityLog).values({
    siteId,
    action: "synced_from_wp",
    details: { fetched: fetchedTotal, matched: matchedTotal, unmatched, perType, durationMs },
  });

  return {
    fetched: fetchedTotal,
    matched: matchedTotal,
    unmatched,
    perType,
    durationMs,
  };
}

