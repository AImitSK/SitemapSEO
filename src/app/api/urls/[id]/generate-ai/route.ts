import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import {
  AI_MODEL,
  generateSeoSuggestions,
  type Suggestion,
} from "@/lib/ai/generate";
import { db } from "@/lib/db";
import { activityLog, drafts, urls } from "@/lib/db/schema";
import { getSiteWithSecret } from "@/lib/sites/queries";
import { fetchPostContent, inferRestBase } from "@/lib/wp/content";

export const runtime = "nodejs";
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

type Body = {
  refinementHint?: string;
  n?: number;
};

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;

  const [urlRow] = await db.select().from(urls).where(eq(urls.id, id)).limit(1);
  if (!urlRow) {
    return NextResponse.json({ error: "URL nicht gefunden" }, { status: 404 });
  }
  const site = await getSiteWithSecret(urlRow.siteId);
  if (!site) {
    return NextResponse.json({ error: "Site nicht gefunden" }, { status: 404 });
  }

  let body: Body = {};
  if (req.headers.get("content-type")?.includes("application/json")) {
    try {
      body = (await req.json()) as Body;
    } catch {
      body = {};
    }
  }

  let fullContent = "";
  const restBase = inferRestBase(urlRow.postType);
  if (restBase && urlRow.wpPostId) {
    fullContent = await fetchPostContent(site, restBase, urlRow.wpPostId);
  }

  let result;
  try {
    result = await generateSeoSuggestions({
      site: { name: site.name, brandContext: site.brandContext },
      url: {
        url: urlRow.url,
        title: urlRow.title,
        language: urlRow.language,
        currentSeoTitle: urlRow.currentSeoTitle,
        currentMetaDesc: urlRow.currentMetaDesc,
        contentExcerpt: urlRow.contentExcerpt,
      },
      fullContent,
      refinementHint: body.refinementHint,
      n: body.n,
    });
  } catch (err) {
    const msg = (err as Error).message;
    return NextResponse.json(
      { error: `KI-Generierung fehlgeschlagen: ${msg}` },
      { status: 502 },
    );
  }

  const inserted = await db
    .insert(drafts)
    .values(
      result.suggestions.map((s: Suggestion) => ({
        urlId: id,
        seoTitle: s.seo_title,
        metaDescription: s.meta_description,
        focusKeyword: s.focus_keyword,
        longtailKeywords: s.longtail_keywords,
        noindex: s.noindex,
        nofollow: s.nofollow,
        source: "ai_generated" as const,
        aiModel: AI_MODEL,
        aiPromptUsed: result.promptUsed,
        refinementHint: body.refinementHint ?? null,
        reasoning: s.reasoning,
      })),
    )
    .returning();

  await db.insert(activityLog).values({
    siteId: urlRow.siteId,
    urlId: id,
    action: "ai_generated",
    details: {
      url: urlRow.url,
      model: AI_MODEL,
      variants: result.suggestions.length,
      durationMs: result.durationMs,
      refinementHint: body.refinementHint ?? null,
      contentLen: fullContent.length,
    },
  });

  return NextResponse.json({
    ok: true,
    drafts: inserted,
    durationMs: result.durationMs,
    contentLen: fullContent.length,
  });
}
