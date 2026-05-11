import { SQL, and, asc, count, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { urls, type Url } from "@/lib/db/schema";

export type UrlListFilters = {
  siteId: string;
  language?: string | null;
  postType?: string | null;
  status?: Url["status"] | null;
  q?: string | null;
  page?: number;
  pageSize?: number;
};

export type UrlListResult = {
  rows: Url[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export type SiteUrlStats = {
  total: number;
  synced: number;
  optimized: number;
  pushed: number;
};

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_SIZE = 50;

export async function listUrls(
  filters: UrlListFilters,
): Promise<UrlListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE),
  );

  const conditions: SQL[] = [eq(urls.siteId, filters.siteId)];
  if (filters.language) conditions.push(eq(urls.language, filters.language));
  if (filters.postType) conditions.push(eq(urls.postType, filters.postType));
  if (filters.status) conditions.push(eq(urls.status, filters.status));
  if (filters.q && filters.q.trim().length > 0) {
    const term = `%${filters.q.trim()}%`;
    conditions.push(
      or(
        ilike(urls.url, term),
        ilike(urls.title, term),
        ilike(urls.currentSeoTitle, term),
      )!,
    );
  }

  const where = and(...conditions);

  const [totalRow] = await db
    .select({ value: count() })
    .from(urls)
    .where(where);
  const total = Number(totalRow?.value ?? 0);

  const rows = await db
    .select()
    .from(urls)
    .where(where)
    .orderBy(asc(urls.language), asc(urls.postType), asc(urls.url))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getSiteUrlStats(siteId: string): Promise<SiteUrlStats> {
  const [row] = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      synced: sql<number>`COUNT(*) FILTER (WHERE ${urls.wpPostId} IS NOT NULL)::int`,
      optimized: sql<number>`COUNT(*) FILTER (WHERE ${urls.status} = 'optimized')::int`,
      pushed: sql<number>`COUNT(*) FILTER (WHERE ${urls.status} = 'pushed')::int`,
    })
    .from(urls)
    .where(eq(urls.siteId, siteId));

  return {
    total: row?.total ?? 0,
    synced: row?.synced ?? 0,
    optimized: row?.optimized ?? 0,
    pushed: row?.pushed ?? 0,
  };
}

export async function listFilterFacets(siteId: string): Promise<{
  languages: string[];
  postTypes: string[];
}> {
  const langs = await db
    .selectDistinct({ value: urls.language })
    .from(urls)
    .where(eq(urls.siteId, siteId))
    .orderBy(asc(urls.language));
  const types = await db
    .selectDistinct({ value: urls.postType })
    .from(urls)
    .where(eq(urls.siteId, siteId))
    .orderBy(asc(urls.postType));
  return {
    languages: langs.map((l) => l.value).filter(Boolean) as string[],
    postTypes: types.map((t) => t.value).filter(Boolean) as string[],
  };
}

