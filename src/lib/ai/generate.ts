import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

import type { Site, Url } from "@/lib/db/schema";
import {
  buildSystemPrompt,
  buildUserPrompt,
  truncateContent,
} from "@/lib/ai/system-prompt";

export const AI_MODEL = "gemini-2.5-flash";

export const SuggestionSchema = z.object({
  focus_keyword: z.string().describe("Hauptkeyword, 1-3 Wörter"),
  longtail_keywords: z
    .array(z.string())
    .describe("0-2 Longtail-Variationen, leeres Array bei dünnem Content"),
  seo_title: z.string().describe("SEO-Titel, 50-60 Zeichen empfohlen"),
  meta_description: z
    .string()
    .describe("Meta-Description, 140-160 Zeichen empfohlen"),
  noindex: z.boolean().describe("true wenn Seite NICHT indexiert werden soll"),
  nofollow: z.boolean().describe("true wenn Links NICHT verfolgt werden sollen"),
  reasoning: z.string().describe("1-2 Sätze Begründung"),
});

export type Suggestion = z.infer<typeof SuggestionSchema>;

const ResponseSchema = z.object({
  suggestions: z
    .array(SuggestionSchema)
    .describe("Liste von Vorschlags-Varianten"),
});

export type GenerateInput = {
  site: Pick<Site, "name" | "brandContext">;
  url: Pick<
    Url,
    "url" | "title" | "language" | "currentSeoTitle" | "currentMetaDesc" | "contentExcerpt"
  >;
  fullContent: string;
  refinementHint?: string;
  n?: number;
};

export type GenerateResult = {
  suggestions: Suggestion[];
  promptUsed: string;
  durationMs: number;
};

export async function generateSeoSuggestions(
  input: GenerateInput,
): Promise<GenerateResult> {
  const n = Math.min(5, Math.max(1, input.n ?? 3));
  const language = input.url.language ?? "de";
  const contentRaw =
    input.fullContent.trim() || input.url.contentExcerpt?.trim() || "";
  const contentTruncated = truncateContent(contentRaw, 6000);

  const system = buildSystemPrompt({
    siteName: input.site.name,
    brandContext: input.site.brandContext,
    language,
    n,
  });
  const userPrompt = buildUserPrompt({
    url: input.url.url,
    pageTitle: input.url.title,
    contentTruncated,
    currentSeoTitle: input.url.currentSeoTitle,
    currentMetaDesc: input.url.currentMetaDesc,
    language,
    refinementHint: input.refinementHint,
  });

  const started = Date.now();
  const { object } = await generateObject({
    model: google(AI_MODEL),
    schema: ResponseSchema,
    system,
    prompt: userPrompt,
    temperature: 0.7,
  });
  const durationMs = Date.now() - started;

  const trimmed = object.suggestions.slice(0, n);

  return {
    suggestions: trimmed,
    promptUsed: userPrompt,
    durationMs,
  };
}
