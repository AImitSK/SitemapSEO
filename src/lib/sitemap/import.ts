import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLog, urls } from "@/lib/db/schema";
import { detectLanguage } from "@/lib/sitemap/language";
import { fetchSitemap } from "@/lib/sitemap/parser";
import { getSiteWithSecret } from "@/lib/sites/queries";

export type ImportResult = {
  parsed: number;
  inserted: number;
  updated: number;
  skipped: number;
  durationMs: number;
};

const INSERT_CHUNK = 200;

export async function importSitemapForSite(siteId: string): Promise<ImportResult> {
  const started = Date.now();
  const site = await getSiteWithSecret(siteId);
  if (!site) {
    throw new Error("Site nicht gefunden");
  }

  const entries = await fetchSitemap(site.sitemapUrl);

  const existingRows = await db
    .select({ url: urls.url })
    .from(urls)
    .where(eq(urls.siteId, siteId));
  const existing = new Set(existingRows.map((r) => r.url));

  const toInsert: Array<{
    siteId: string;
    url: string;
    language: string;
    sitemapLastmod: Date | null;
  }> = [];
  const toUpdate: Array<{
    url: string;
    language: string;
    sitemapLastmod: Date | null;
  }> = [];

  for (const entry of entries) {
    const language = detectLanguage(
      entry.url,
      site.languages,
      site.primaryLanguage,
    );
    if (existing.has(entry.url)) {
      toUpdate.push({
        url: entry.url,
        language,
        sitemapLastmod: entry.lastmod ?? null,
      });
    } else {
      toInsert.push({
        siteId,
        url: entry.url,
        language,
        sitemapLastmod: entry.lastmod ?? null,
      });
    }
  }

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
    const chunk = toInsert.slice(i, i + INSERT_CHUNK);
    const res = await db
      .insert(urls)
      .values(chunk)
      .onConflictDoNothing()
      .returning({ id: urls.id });
    inserted += res.length;
  }

  let updated = 0;
  for (let i = 0; i < toUpdate.length; i += INSERT_CHUNK) {
    const chunk = toUpdate.slice(i, i + INSERT_CHUNK);
    for (const row of chunk) {
      await db
        .update(urls)
        .set({
          language: row.language,
          sitemapLastmod: row.sitemapLastmod,
        })
        .where(sql`${urls.siteId} = ${siteId} AND ${urls.url} = ${row.url}`);
      updated += 1;
    }
  }

  const skipped = entries.length - inserted - updated;
  const durationMs = Date.now() - started;

  await db.insert(activityLog).values({
    siteId,
    action: "sitemap_imported",
    details: { parsed: entries.length, inserted, updated, skipped, durationMs },
  });

  return {
    parsed: entries.length,
    inserted,
    updated,
    skipped,
    durationMs,
  };
}

