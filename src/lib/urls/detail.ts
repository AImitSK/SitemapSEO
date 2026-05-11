import { and, desc, eq, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { drafts, sites, urls, type Draft, type Url } from "@/lib/db/schema";
import type { PublicSite } from "@/lib/sites/queries";

export type UrlWithSite = {
  url: Url;
  site: PublicSite;
  recentDrafts: Draft[];
  siblingForeignCount: number;
};

export async function getUrlWithSite(urlId: string): Promise<UrlWithSite | null> {
  const [row] = await db.select().from(urls).where(eq(urls.id, urlId)).limit(1);
  if (!row) return null;

  const [siteRow] = await db
    .select()
    .from(sites)
    .where(eq(sites.id, row.siteId))
    .limit(1);
  if (!siteRow) return null;

  const recentDrafts = await db
    .select()
    .from(drafts)
    .where(eq(drafts.urlId, urlId))
    .orderBy(desc(drafts.createdAt))
    .limit(5);

  let siblingForeignCount = 0;
  if (row.translationGroupId) {
    const [count] = await db
      .select({ value: sql<number>`COUNT(*)::int` })
      .from(urls)
      .where(
        and(
          eq(urls.siteId, row.siteId),
          eq(urls.translationGroupId, row.translationGroupId),
          ne(urls.id, row.id),
        ),
      );
    siblingForeignCount = Number(count?.value ?? 0);
  }

  const { wpAppPassword: _omit, ...publicSite } = siteRow;
  return { url: row, site: publicSite, recentDrafts, siblingForeignCount };
}
