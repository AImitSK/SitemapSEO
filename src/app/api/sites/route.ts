import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { sites } from "@/lib/db/schema";
import { encrypt } from "@/lib/crypto";
import { listSites } from "@/lib/sites/queries";
import { siteCreateSchema } from "@/lib/validators/site";

export const runtime = "nodejs";

export async function GET() {
  const rows = await listSites();
  return NextResponse.json({ sites: rows });
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Ungültiges JSON im Request-Body" },
      { status: 400 },
    );
  }

  const parsed = siteCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const data = parsed.data;

  const [inserted] = await db
    .insert(sites)
    .values({
      name: data.name,
      baseUrl: data.baseUrl,
      sitemapUrl: data.sitemapUrl,
      wpUsername: data.wpUsername,
      wpAppPassword: encrypt(data.wpAppPassword),
      languages: data.languages,
      primaryLanguage: data.primaryLanguage,
      brandContext: data.brandContext?.trim() || null,
    })
    .returning();

  const { wpAppPassword: _omit, ...publicSite } = inserted;
  return NextResponse.json({ site: publicSite }, { status: 201 });
}
