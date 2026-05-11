import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { drafts, sites, urls, type Draft, type Url } from "@/lib/db/schema";
import type { PublicSite } from "@/lib/sites/queries";

export type UrlWithSite = {
  url: Url;
  site: PublicSite;
  recentDrafts: Draft[];
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

  const { wpAppPassword: _omit, ...publicSite } = siteRow;
  return { url: row, site: publicSite, recentDrafts };
}
