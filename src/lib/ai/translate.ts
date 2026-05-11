import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

import { AI_MODEL } from "@/lib/ai/generate";
import {
  buildTranslateSystemPrompt,
  buildTranslateUserPrompt,
} from "@/lib/ai/translate-prompt";

export const TranslationSchema = z.object({
  seo_title: z.string().describe("Übersetzter SEO-Titel, möglichst 50-60 Zeichen"),
  meta_description: z
    .string()
    .describe("Übersetzte Meta-Description, möglichst 140-160 Zeichen"),
  focus_keyword: z.string().describe("Übersetztes Hauptkeyword"),
  longtail_keywords: z
    .array(z.string())
    .describe("Übersetzte Longtails, gleiche Anzahl wie Quelle"),
});

export type Translation = z.infer<typeof TranslationSchema>;

export type TranslateInput = {
  source: {
    language: string;
    seoTitle: string;
    metaDescription: string;
    focusKeyword: string;
    longtailKeywords: string[];
  };
  targetLanguage: string;
  siteName: string;
  brandContext: string | null;
};

export type TranslateResult = {
  translation: Translation;
  promptUsed: string;
  durationMs: number;
};

export async function translateSeoFields(
  input: TranslateInput,
): Promise<TranslateResult> {
  const system = buildTranslateSystemPrompt({
    sourceLanguage: input.source.language,
    targetLanguage: input.targetLanguage,
    siteName: input.siteName,
    brandContext: input.brandContext,
  });
  const userPrompt = buildTranslateUserPrompt({
    seoTitle: input.source.seoTitle,
    metaDescription: input.source.metaDescription,
    focusKeyword: input.source.focusKeyword,
    longtailKeywords: input.source.longtailKeywords,
  });

  const started = Date.now();
  const { object } = await generateObject({
    model: google(AI_MODEL),
    schema: TranslationSchema,
    system,
    prompt: userPrompt,
    temperature: 0.3,
  });
  const durationMs = Date.now() - started;

  return { translation: object, promptUsed: userPrompt, durationMs };
}
