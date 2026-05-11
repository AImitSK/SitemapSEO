import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { sites, type Site } from "@/lib/db/schema";

export type PublicSite = Omit<Site, "wpAppPassword">;

function stripPassword(row: Site): PublicSite {
  const { wpAppPassword: _omit, ...rest } = row;
  return rest;
}

export async function listSites(): Promise<PublicSite[]> {
  const rows = await db
    .select()
    .from(sites)
    .orderBy(asc(sites.name), desc(sites.createdAt));
  return rows.map(stripPassword);
}

export async function getSite(id: string): Promise<PublicSite | null> {
  const [row] = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
  return row ? stripPassword(row) : null;
}

export async function getSiteWithSecret(
  id: string,
): Promise<Site | null> {
  const [row] = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
  return row ?? null;
}
