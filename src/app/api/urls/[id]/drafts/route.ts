import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { translateSeoFields } from "@/lib/ai/translate";
import { db } from "@/lib/db";
import { activityLog, drafts, sites, urls } from "@/lib/db/schema";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  seoTitle: z.string().min(1).max(200),
  metaDescription: z.string().min(1).max(400),
  focusKeyword: z.string().min(1).max(100),
  longtailKeywords: z.array(z.string().min(1).max(100)).max(5).default([]),
  noindex: z.boolean().default(false),
  nofollow: z.boolean().default(false),
  fromDraftId: z.string().uuid().optional(),
  applyTranslations: z.boolean().default(false),
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
    .where(and(eq(urls.id, id), inArray(urls.status, ["pending", "optimized"])));

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

  let translations: Array<{
    urlId: string;
    targetLanguage: string;
    draftId: string;
  }> = [];
  let translationErrors: Array<{ targetLanguage: string; error: string }> = [];

  if (data.applyTranslations) {
    const [siteRow] = await db
      .select()
      .from(sites)
      .where(eq(sites.id, urlRow.siteId))
      .limit(1);

    if (
      siteRow &&
      urlRow.language === siteRow.primaryLanguage &&
      urlRow.translationGroupId
    ) {
      const siblings = await db
        .select()
        .from(urls)
        .where(
          and(
            eq(urls.siteId, urlRow.siteId),
            eq(urls.translationGroupId, urlRow.translationGroupId),
          ),
        );

      const foreignSiblings = siblings.filter(
        (s) => s.id !== urlRow.id && s.language && s.language !== siteRow.primaryLanguage,
      );

      for (const sibling of foreignSiblings) {
        try {
          const tr = await translateSeoFields({
            source: {
              language: urlRow.language ?? siteRow.primaryLanguage,
              seoTitle: data.seoTitle,
              metaDescription: data.metaDescription,
              focusKeyword: data.focusKeyword,
              longtailKeywords: data.longtailKeywords,
            },
            targetLanguage: sibling.language!,
            siteName: siteRow.name,
            brandContext: siteRow.brandContext,
          });
          const [translatedDraft] = await db
            .insert(drafts)
            .values({
              urlId: sibling.id,
              seoTitle: tr.translation.seo_title,
              metaDescription: tr.translation.meta_description,
              focusKeyword: tr.translation.focus_keyword,
              longtailKeywords: tr.translation.longtail_keywords,
              noindex: data.noindex,
              nofollow: data.nofollow,
              source: "translated",
              parentDraftId: inserted.id,
              aiModel: "gemini-2.5-flash",
              aiPromptUsed: tr.promptUsed,
            })
            .returning();
          await db
            .update(urls)
            .set({ status: "draft" })
            .where(
              and(
                eq(urls.id, sibling.id),
                inArray(urls.status, ["pending", "optimized"]),
              ),
            );
          translations.push({
            urlId: sibling.id,
            targetLanguage: sibling.language!,
            draftId: translatedDraft.id,
          });
        } catch (err) {
          translationErrors.push({
            targetLanguage: sibling.language!,
            error: (err as Error).message,
          });
        }
      }

      await db.insert(activityLog).values({
        siteId: urlRow.siteId,
        urlId: id,
        action: "translations_generated",
        details: {
          parentDraftId: inserted.id,
          translations: translations.length,
          errors: translationErrors.length,
          errorDetail: translationErrors,
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    draft: inserted,
    translations,
    translationErrors,
  });
}
