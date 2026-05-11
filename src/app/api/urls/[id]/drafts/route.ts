import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { activityLog, drafts, urls } from "@/lib/db/schema";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  seoTitle: z.string().min(1).max(200),
  metaDescription: z.string().min(1).max(400),
  focusKeyword: z.string().min(1).max(100),
  longtailKeywords: z.array(z.string().min(1).max(100)).max(5).default([]),
  noindex: z.boolean().default(false),
  nofollow: z.boolean().default(false),
  fromDraftId: z.string().uuid().optional(),
});

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  const [urlRow] = await db.select().from(urls).where(eq(urls.id, id)).limit(1);
  if (!urlRow) {
    return NextResponse.json({ error: "URL nicht gefunden" }, { status: 404 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Ungültiges JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validierungsfehler", issues: parsed.error.issues },
      { status: 422 },
    );
  }
  const data = parsed.data;

  const source: "ai_edited" | "manual_edit" = data.fromDraftId
    ? "ai_edited"
    : "manual_edit";

  const [inserted] = await db
    .insert(drafts)
    .values({
      urlId: id,
      seoTitle: data.seoTitle,
      metaDescription: data.metaDescription,
      focusKeyword: data.focusKeyword,
      longtailKeywords: data.longtailKeywords,
      noindex: data.noindex,
      nofollow: data.nofollow,
      source,
      parentDraftId: data.fromDraftId ?? null,
    })
    .returning();

  await db
    .update(urls)
    .set({ status: "draft" })
    .where(
      and(
        eq(urls.id, id),
        inArray(urls.status, ["pending", "optimized"]),
      ),
    );

  await db.insert(activityLog).values({
    siteId: urlRow.siteId,
    urlId: id,
    action: "draft_saved",
    details: {
      draftId: inserted.id,
      source,
      fromDraftId: data.fromDraftId ?? null,
    },
  });

  return NextResponse.json({ ok: true, draft: inserted });
}
