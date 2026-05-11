import { z } from "zod";

const languageCode = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{2}$/i, "Sprachcode muss aus 2 Buchstaben bestehen");

export const siteBaseSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich"),
  baseUrl: z
    .string()
    .trim()
    .url("Bitte eine vollständige URL angeben (https://...)")
    .refine((v) => !v.endsWith("/"), "Bitte ohne trailing slash"),
  sitemapUrl: z
    .string()
    .trim()
    .url("Bitte eine vollständige URL angeben (https://...)"),
  wpUsername: z.string().trim().min(1, "WP-Benutzername ist erforderlich"),
  languages: z
    .array(languageCode)
    .min(1, "Mindestens eine Sprache angeben"),
  primaryLanguage: languageCode,
  brandContext: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const siteCreateSchema = siteBaseSchema
  .extend({
    wpAppPassword: z
      .string()
      .min(8, "Application-Password muss mindestens 8 Zeichen haben"),
  })
  .refine((v) => v.languages.includes(v.primaryLanguage), {
    message: "Primary-Sprache muss in der Sprach-Liste enthalten sein",
    path: ["primaryLanguage"],
  });

export const siteUpdateSchema = siteBaseSchema
  .partial()
  .extend({
    wpAppPassword: z
      .string()
      .min(8, "Application-Password muss mindestens 8 Zeichen haben")
      .optional()
      .or(z.literal("")),
  })
  .refine(
    (v) =>
      !v.primaryLanguage ||
      !v.languages ||
      v.languages.includes(v.primaryLanguage),
    {
      message: "Primary-Sprache muss in der Sprach-Liste enthalten sein",
      path: ["primaryLanguage"],
    },
  );

export type SiteCreateInput = z.infer<typeof siteCreateSchema>;
export type SiteUpdateInput = z.infer<typeof siteUpdateSchema>;
