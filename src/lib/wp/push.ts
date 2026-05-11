import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog, backups, drafts, urls } from "@/lib/db/schema";
import { getSiteWithSecret } from "@/lib/sites/queries";
import { wpFetch } from "@/lib/wp/client";
import { inferRestBase } from "@/lib/wp/content";

export type PushResult =
  | {
      ok: true;
      backupId: string;
      pushedDraftId: string;
      durationMs: number;
    }
  | {
      ok: false;
      error: string;
      stage:
        | "load_url"
        | "load_draft"
        | "load_site"
        | "no_wp_post"
        | "no_rest_base"
        | "backup_write"
        | "wp_patch"
        | "url_update";
    };

function metaRobotsString(v: boolean): string {
  return v ? "1" : "0";
}

export async function pushUrlToWp(input: {
  urlId: string;
  draftId: string;
}): Promise<PushResult> {
  const started = Date.now();

  const [urlRow] = await db
    .select()
    .from(urls)
    .where(eq(urls.id, input.urlId))
    .limit(1);
  if (!urlRow) {
    return { ok: false, error: "URL nicht gefunden", stage: "load_url" };
  }

  const [draftRow] = await db
    .select()
    .from(drafts)
    .where(eq(drafts.id, input.draftId))
    .limit(1);
  if (!draftRow || draftRow.urlId !== input.urlId) {
    return { ok: false, error: "Draft nicht gefunden", stage: "load_draft" };
  }

  const site = await getSiteWithSecret(urlRow.siteId);
  if (!site) {
    return { ok: false, error: "Site nicht gefunden", stage: "load_site" };
  }

  if (!urlRow.wpPostId) {
    return {
      ok: false,
      error: "URL hat keine wp_post_id — bitte erst syncen",
      stage: "no_wp_post",
    };
  }

  const restBase = inferRestBase(urlRow.postType);
  if (!restBase) {
    return {
      ok: false,
      error: "Post-Typ unbekannt — kein REST-Base ableitbar",
      stage: "no_rest_base",
    };
  }

  // STEP 1: Backup zuerst — Spec-Invariante „Push ohne Backup = Bug"
  let backupId: string;
  try {
    const [inserted] = await db
      .insert(backups)
      .values({
        urlId: input.urlId,
        seoTitle: urlRow.currentSeoTitle,
        metaDescription: urlRow.currentMetaDesc,
        focusKeyword: urlRow.currentFocusKeyword,
        longtailKeywords: [],
        noindex: urlRow.currentMetaRobotsNoindex,
        nofollow: urlRow.currentMetaRobotsNofollow,
        draftIdAtPush: input.draftId,
      })
      .returning({ id: backups.id });
    backupId = inserted.id;
  } catch (err) {
    return {
      ok: false,
      error: `Backup fehlgeschlagen: ${(err as Error).message}`,
      stage: "backup_write",
    };
  }

  // STEP 2: WP-PATCH
  const patchBody = {
    meta: {
      _yoast_wpseo_title: draftRow.seoTitle ?? "",
      _yoast_wpseo_metadesc: draftRow.metaDescription ?? "",
      _yoast_wpseo_focuskw: draftRow.focusKeyword ?? "",
      "_yoast_wpseo_meta-robots-noindex": metaRobotsString(draftRow.noindex),
      "_yoast_wpseo_meta-robots-nofollow": metaRobotsString(draftRow.nofollow),
    },
  };

  try {
    const res = await wpFetch(
      site,
      `/wp/v2/${restBase}/${urlRow.wpPostId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
        timeoutMs: 30_000,
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      await db.update(urls).set({ status: "error" }).where(eq(urls.id, input.urlId));
      await db.insert(activityLog).values({
        siteId: urlRow.siteId,
        urlId: input.urlId,
        action: "push_failed",
        details: {
          status: res.status,
          body: body.slice(0, 500),
          draftId: input.draftId,
          backupId,
        },
      });
      return {
        ok: false,
        error: `WP-PATCH fehlgeschlagen (${res.status}): ${body.slice(0, 200)}`,
        stage: "wp_patch",
      };
    }
  } catch (err) {
    await db.update(urls).set({ status: "error" }).where(eq(urls.id, input.urlId));
    return {
      ok: false,
      error: `Verbindungsfehler beim PATCH: ${(err as Error).message}`,
      stage: "wp_patch",
    };
  }

  // STEP 3: URL + Draft state update
  try {
    await db
      .update(urls)
      .set({
        currentSeoTitle: draftRow.seoTitle,
        currentMetaDesc: draftRow.metaDescription,
        currentFocusKeyword: draftRow.focusKeyword,
        currentMetaRobotsNoindex: draftRow.noindex,
        currentMetaRobotsNofollow: draftRow.nofollow,
        status: "pushed",
      })
      .where(eq(urls.id, input.urlId));

    await db
      .update(drafts)
      .set({ pushedAt: new Date() })
      .where(eq(drafts.id, input.draftId));
  } catch (err) {
    return {
      ok: false,
      error: `URL-Update fehlgeschlagen: ${(err as Error).message}`,
      stage: "url_update",
    };
  }

  const durationMs = Date.now() - started;
  await db.insert(activityLog).values({
    siteId: urlRow.siteId,
    urlId: input.urlId,
    action: "pushed_to_wp",
    details: {
      draftId: input.draftId,
      backupId,
      wpPostId: urlRow.wpPostId,
      restBase,
      durationMs,
    },
  });

  return {
    ok: true,
    backupId,
    pushedDraftId: input.draftId,
    durationMs,
  };
}

export async function getLatestBackup(urlId: string) {
  const [row] = await db
    .select()
    .from(backups)
    .where(eq(backups.urlId, urlId))
    .orderBy(desc(backups.createdAt))
    .limit(1);
  return row ?? null;
}
