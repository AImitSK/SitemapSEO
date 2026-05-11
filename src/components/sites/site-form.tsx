"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z
  .object({
    name: z.string().trim().min(1, "Name ist erforderlich"),
    baseUrl: z
      .string()
      .trim()
      .url("Vollständige URL angeben (https://...)")
      .refine((v) => !v.endsWith("/"), "Bitte ohne trailing slash"),
    sitemapUrl: z.string().trim().url("Vollständige URL angeben"),
    wpUsername: z.string().trim().min(1, "WP-Benutzer angeben"),
    wpAppPassword: z.string(),
    languagesCsv: z
      .string()
      .trim()
      .min(2, "Mindestens eine Sprache angeben")
      .regex(/^[a-zA-Z, ]+$/i, "Nur Buchstaben und Kommas erlaubt"),
    primaryLanguage: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z]{2}$/i, "2-Buchstaben-Code, z.B. de"),
    brandContext: z.string().trim().max(2000).optional().or(z.literal("")),
  });

type FormValues = z.infer<typeof formSchema>;

export type SiteFormDefaults = Partial<FormValues>;

export type SiteFormMode = "create" | "edit";

type SiteFormProps = {
  mode: SiteFormMode;
  siteId?: string;
  defaults?: SiteFormDefaults;
};

function parseLanguages(csv: string): string[] {
  return csv
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length === 2);
}

export function SiteForm({ mode, siteId, defaults }: SiteFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: defaults?.name ?? "",
      baseUrl: defaults?.baseUrl ?? "",
      sitemapUrl: defaults?.sitemapUrl ?? "",
      wpUsername: defaults?.wpUsername ?? "",
      wpAppPassword: "",
      languagesCsv: defaults?.languagesCsv ?? "de",
      primaryLanguage: defaults?.primaryLanguage ?? "de",
      brandContext: defaults?.brandContext ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const languages = parseLanguages(values.languagesCsv);
      if (!languages.includes(values.primaryLanguage)) {
        toast.error(
          "Die Primary-Sprache muss in der Sprach-Liste enthalten sein.",
        );
        return;
      }

      const body: Record<string, unknown> = {
        name: values.name,
        baseUrl: values.baseUrl,
        sitemapUrl: values.sitemapUrl,
        wpUsername: values.wpUsername,
        languages,
        primaryLanguage: values.primaryLanguage,
        brandContext: values.brandContext || "",
      };

      if (values.wpAppPassword) {
        body.wpAppPassword = values.wpAppPassword;
      } else if (mode === "create") {
        toast.error("WP-Application-Password ist erforderlich.");
        return;
      }

      const endpoint =
        mode === "create" ? "/api/sites" : `/api/sites/${siteId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        toast.error(data?.error ?? `Fehler ${res.status}`);
        return;
      }

      const data = (await res.json()) as { site: { id: string } };
      if (mode === "create") {
        toast.success("Site angelegt");
        router.push(`/sites/${data.site.id}/settings`);
      } else {
        toast.success("Site aktualisiert");
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      toast.error("Netzwerkfehler – bitte erneut versuchen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 max-w-2xl">
      <Field label="Name" error={errors.name?.message}>
        <Input
          placeholder="z. B. IBD Wickeltechnik"
          {...register("name")}
        />
      </Field>

      <Field
        label="Base-URL"
        hint="Ohne Slash am Ende"
        error={errors.baseUrl?.message}
      >
        <Input
          placeholder="https://www.ibd-wt.de"
          {...register("baseUrl")}
        />
      </Field>

      <Field label="Sitemap-URL" error={errors.sitemapUrl?.message}>
        <Input
          placeholder="https://www.ibd-wt.de/sitemap_index.xml"
          {...register("sitemapUrl")}
        />
      </Field>

      <div className="grid gap-4 grid-cols-2">
        <Field label="WP-Benutzer" error={errors.wpUsername?.message}>
          <Input
            placeholder="seo-bot"
            autoComplete="username"
            {...register("wpUsername")}
          />
        </Field>
        <Field
          label={
            mode === "edit"
              ? "Neues Application-Password (optional)"
              : "Application-Password"
          }
          hint={
            mode === "edit"
              ? "Leer lassen, um aktuelles zu behalten."
              : "Aus WordPress unter Benutzer → Profil → Anwendungs-Passwörter."
          }
          error={errors.wpAppPassword?.message}
        >
          <Input
            type="password"
            placeholder={mode === "edit" ? "•••• unverändert" : "xxxx xxxx ..."}
            autoComplete="new-password"
            {...register("wpAppPassword")}
          />
        </Field>
      </div>

      <div className="grid gap-4 grid-cols-2">
        <Field
          label="Sprachen (kommasepariert)"
          hint="2-Buchstaben-Codes, z. B. de,en,nl"
          error={errors.languagesCsv?.message}
        >
          <Input
            placeholder="de,en,nl,fr,it,pl,es"
            {...register("languagesCsv")}
          />
        </Field>
        <Field
          label="Primary-Sprache"
          hint="Muss in der Liste enthalten sein"
          error={errors.primaryLanguage?.message}
        >
          <Input placeholder="de" {...register("primaryLanguage")} />
        </Field>
      </div>

      <Field
        label="Brand-Kontext (für KI-Prompt)"
        hint="Branche, Produkte, Tonalität – wird dem KI-Modell mitgegeben."
        error={errors.brandContext?.message}
      >
        <Textarea
          rows={5}
          placeholder="z. B. B2B-Industrie, Wickeltechnik – Spannwellen, Spannköpfe, Bremsen, Bahnregelung. Tonalität sober und technisch."
          {...register("brandContext")}
        />
      </Field>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : null}
          {mode === "create" ? "Site anlegen" : "Änderungen speichern"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
