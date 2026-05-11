"use client";

import { XIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  siteId: string;
  languages: string[];
  postTypes: string[];
  current: {
    lang?: string;
    type?: string;
    status?: string;
    q?: string;
  };
};

const STATUSES: Array<{ value: string; label: string }> = [
  { value: "pending", label: "Ausstehend" },
  { value: "optimized", label: "Optimiert" },
  { value: "draft", label: "Entwurf" },
  { value: "pushed", label: "Gepusht" },
  { value: "error", label: "Fehler" },
];

export function UrlFilters({ siteId, languages, postTypes, current }: Props) {
  const hasFilters = Boolean(
    current.lang || current.type || current.status || current.q,
  );

  return (
    <form
      method="get"
      action={`/sites/${siteId}/urls`}
      className="flex flex-wrap items-end gap-3 border-b pb-4"
    >
      <FilterField label="Sprache">
        <select
          name="lang"
          defaultValue={current.lang ?? ""}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="">Alle</option>
          {languages.map((l) => (
            <option key={l} value={l}>
              {l.toUpperCase()}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Post-Typ">
        <select
          name="type"
          defaultValue={current.type ?? ""}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="">Alle</option>
          {postTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Status">
        <select
          name="status"
          defaultValue={current.status ?? ""}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          <option value="">Alle</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="Suche">
        <Input
          name="q"
          defaultValue={current.q ?? ""}
          placeholder="URL, Titel, SEO-Titel ..."
          className="h-8 w-64"
        />
      </FilterField>

      <Button type="submit" size="sm">
        Filtern
      </Button>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={`/sites/${siteId}/urls`} />}
        >
          <XIcon className="size-3.5" />
          Zurücksetzen
        </Button>
      ) : null}
    </form>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
