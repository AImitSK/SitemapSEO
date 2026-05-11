import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { encrypt } from "@/lib/crypto";
import { getSite } from "@/lib/sites/queries";
import { siteUpdateSchema } from "@/lib/validators/site";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const site = await getSite(id);
  if (!site) {
    return NextResponse.json({ error: "Site nicht gefunden" }, { status: 404 });
  }
  return NextResponse.json({ site });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const existing = await getSite(id);
  if (!existing) {
    return NextResponse.json({ error: "Site nicht gefunden" }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges JSON im Request-Body" },
      { status: 400 },
    );
  }

  const parsed = siteUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const data = parsed.data;
  const update: Partial<typeof sites.$inferInsert> = {};

  if (data.name !== undefined) update.name = data.name;
  if (data.baseUrl !== undefined) update.baseUrl = data.baseUrl;
  if (data.sitemapUrl !== undefined) update.sitemapUrl = data.sitemapUrl;
  if (data.wpUsername !== undefined) update.wpUsername = data.wpUsername;
  if (data.languages !== undefined) update.languages = data.languages;
  if (data.primaryLanguage !== undefined)
    update.primaryLanguage = data.primaryLanguage;
  if (data.brandContext !== undefined)
    update.brandContext = data.brandContext?.trim() || null;
  if (data.wpAppPassword && data.wpAppPassword.length > 0) {
    update.wpAppPassword = encrypt(data.wpAppPassword);
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ site: existing });
  }

  const [updated] = await db
    .update(sites)
    .set(update)
    .where(eq(sites.id, id))
    .returning();

  const { wpAppPassword: _omit, ...publicSite } = updated;
  return NextResponse.json({ site: publicSite });
}
