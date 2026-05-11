"use client";

import {
  CheckIcon,
  Loader2Icon,
  RefreshCwIcon,
  SaveIcon,
  SendIcon,
  SparklesIcon,
  Undo2Icon,
  XIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { LengthCounter } from "@/components/editor/length-counter";
import { PushDialog } from "@/components/editor/push-dialog";
import { RollbackDialog } from "@/components/editor/rollback-dialog";
import { SerpPreview } from "@/components/editor/serp-preview";
import { VariableButtons } from "@/components/editor/variable-buttons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Draft, Url } from "@/lib/db/schema";

type Suggestion = {
  id: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  longtailKeywords: string[];
  noindex: boolean;
  nofollow: boolean;
  reasoning: string | null;
};

type FormValues = {
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  longtailKeywordsCsv: string;
  noindex: boolean;
  nofollow: boolean;
};

type Props = {
  url: Url;
  siteName: string;
  isPrimaryLanguage: boolean;
  siblingForeignCount: number;
  latestDraft: Draft | null;
};

function draftToSuggestion(d: Draft): Suggestion {
  return {
    id: d.id,
    seoTitle: d.seoTitle ?? "",
    metaDescription: d.metaDescription ?? "",
    focusKeyword: d.focusKeyword ?? "",
    longtailKeywords: d.longtailKeywords ?? [],
    noindex: d.noindex,
    nofollow: d.nofollow,
    reasoning: d.reasoning,
  };
}

export function UrlEditor({
  url,
  siteName,
  isPrimaryLanguage,
  siblingForeignCount,
  latestDraft,
}: Props) {
  const router = useRouter();
  const titleRef = useRef<HTMLInputElement>(null);
  const canTranslate = isPrimaryLanguage && siblingForeignCount > 0;

  const form = useForm<FormValues>({
    defaultValues: {
      seoTitle: latestDraft?.seoTitle ?? url.currentSeoTitle ?? "",
      metaDescription:
        latestDraft?.metaDescription ?? url.currentMetaDesc ?? "",
      focusKeyword: latestDraft?.focusKeyword ?? url.currentFocusKeyword ?? "",
      longtailKeywordsCsv: latestDraft?.longtailKeywords?.join(", ") ?? "",
      noindex: latestDraft?.noindex ?? url.currentMetaRobotsNoindex,
      nofollow: latestDraft?.nofollow ?? url.currentMetaRobotsNofollow,
    },
  });

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingGen, setLoadingGen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fromDraftId, setFromDraftId] = useState<string | null>(
    latestDraft?.source === "ai_generated" || latestDraft?.source === "ai_edited"
      ? (latestDraft.parentDraftId ?? null)
      : null,
  );
  const [refineDialogOpen, setRefineDialogOpen] = useState(false);
  const [refinementHint, setRefinementHint] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [applyTranslations, setApplyTranslations] = useState(false);
  const [pushDialogOpen, setPushDialogOpen] = useState(false);
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false);

  const seoTitle = form.watch("seoTitle");
  const metaDescription = form.watch("metaDescription");

  async function generate(opts?: { hint?: string }) {
    setLoadingGen(true);
    try {
      const res = await fetch(`/api/urls/${url.id}/generate-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refinementHint: opts?.hint ?? null }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? `Fehler ${res.status}`);
        return;
      }
      const fresh = (data.drafts as Draft[]).map(draftToSuggestion);
      setSuggestions(fresh);
      toast.success(
        `${fresh.length} KI-Vorschläge erzeugt (${Math.round(data.durationMs / 100) / 10}s)`,
      );
    } catch (err) {
      toast.error(`Netzwerkfehler: ${(err as Error).message}`);
    } finally {
      setLoadingGen(false);
    }
  }

  function applySuggestion(s: Suggestion) {
    form.reset({
      seoTitle: s.seoTitle,
      metaDescription: s.metaDescription,
      focusKeyword: s.focusKeyword,
      longtailKeywordsCsv: s.longtailKeywords.join(", "),
      noindex: s.noindex,
      nofollow: s.nofollow,
    });
    setFromDraftId(s.id);
    toast.message("Vorschlag in Werte übernommen — anpassen und speichern.");
  }

  function onSubmit(values: FormValues) {
    // Wenn Übersetzung möglich → erst Dialog für Bestätigung + Auswahl
    if (canTranslate) {
      setSaveDialogOpen(true);
      return;
    }
    void saveDraft(values, false);
  }

  async function saveDraft(values: FormValues, translate: boolean) {
    setSaving(true);
    try {
      const longtailKeywords = values.longtailKeywordsCsv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5);
      const res = await fetch(`/api/urls/${url.id}/drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seoTitle: values.seoTitle,
          metaDescription: values.metaDescription,
          focusKeyword: values.focusKeyword,
          longtailKeywords,
          noindex: values.noindex,
          nofollow: values.nofollow,
          fromDraftId: fromDraftId ?? undefined,
          applyTranslations: translate,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? `Fehler ${res.status}`);
        return;
      }
      const tCount = data.translations?.length ?? 0;
      const tErr = data.translationErrors?.length ?? 0;
      if (translate && tCount > 0) {
        toast.success(`Draft + ${tCount} Übersetzungen gespeichert`, {
          description:
            tErr > 0 ? `${tErr} Übersetzung(en) fehlgeschlagen` : undefined,
        });
      } else if (translate && tErr > 0) {
        toast.warning(
          `Draft gespeichert, aber alle ${tErr} Übersetzungen fehlgeschlagen`,
        );
      } else {
        toast.success("Draft gespeichert");
      }
      setSaveDialogOpen(false);
      setApplyTranslations(false);
      router.refresh();
    } catch (err) {
      toast.error(`Netzwerkfehler: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function discard() {
    form.reset({
      seoTitle: url.currentSeoTitle ?? "",
      metaDescription: url.currentMetaDesc ?? "",
      focusKeyword: url.currentFocusKeyword ?? "",
      longtailKeywordsCsv: "",
      noindex: false,
      nofollow: false,
    });
    setFromDraftId(null);
    toast.message("Auf aktuelle Yoast-Werte zurückgesetzt.");
  }

  function insertVariable(value: string) {
    const el = titleRef.current;
    if (!el) {
      form.setValue("seoTitle", form.getValues("seoTitle") + value);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const next = before + value + after;
    form.setValue("seoTitle", next, { shouldDirty: true });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + value.length, start + value.length);
    });
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Werte</CardTitle>
          <CardDescription>
            Aktuelle Yoast-Werte oben, Edit-Felder unten. Längen-Indikator basiert
            auf der gerenderten Version (Variablen ersetzt).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CurrentValues url={url} />

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FieldRow
              label="SEO-Titel"
              counter={
                <LengthCounter length={seoTitle.length} kind="seo-title" />
              }
            >
              <Input
                {...form.register("seoTitle")}
                ref={(el) => {
                  form.register("seoTitle").ref(el);
                  titleRef.current = el;
                }}
                placeholder="Spannwellen für Wickeltechnik - IBD Wickeltechnik"
              />
              <VariableButtons onInsert={insertVariable} />
            </FieldRow>

            <FieldRow
              label="Meta-Description"
              counter={
                <LengthCounter
                  length={metaDescription.length}
                  kind="meta-desc"
                />
              }
            >
              <Textarea
                rows={3}
                {...form.register("metaDescription")}
                placeholder="Präzise, technische Beschreibung mit Haupt-Keyword..."
              />
            </FieldRow>

            <FieldRow label="Focus-Keyword">
              <Input
                {...form.register("focusKeyword")}
                placeholder="z. B. Spannwellen"
              />
            </FieldRow>

            <FieldRow label="Longtail-Keywords">
              <Input
                {...form.register("longtailKeywordsCsv")}
                placeholder="kommasepariert, z. B. Spannwellen kaufen, hochwertige Spannwellen"
              />
            </FieldRow>

            <div className="grid grid-cols-2 gap-4">
              <ToggleRow
                label="noindex"
                description="Seite NICHT in Suchergebnissen anzeigen"
                checked={form.watch("noindex")}
                onCheckedChange={(v) => form.setValue("noindex", v)}
              />
              <ToggleRow
                label="nofollow"
                description="Suchmaschinen folgen Links auf der Seite NICHT"
                checked={form.watch("nofollow")}
                onCheckedChange={(v) => form.setValue("nofollow", v)}
              />
            </div>

            <SerpPreview
              siteName={siteName}
              url={url.url}
              seoTitle={seoTitle}
              metaDescription={metaDescription}
            />

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                {fromDraftId
                  ? "Basiert auf KI-Vorschlag (wird als „KI bearbeitet“ gespeichert)"
                  : "Manueller Draft"}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={discard}
                  disabled={saving}
                >
                  <XIcon className="size-3.5" />
                  Verwerfen
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? (
                    <Loader2Icon className="size-3.5 animate-spin" />
                  ) : (
                    <SaveIcon className="size-3.5" />
                  )}
                  Als Draft speichern
                </Button>
              </div>
            </div>
          </form>

          {latestDraft ? (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t">
              <Button
                type="button"
                size="sm"
                onClick={() => setPushDialogOpen(true)}
              >
                <SendIcon className="size-3.5" />
                Pushen zu WordPress
              </Button>
              {url.status === "pushed" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setRollbackDialogOpen(true)}
                >
                  <Undo2Icon className="size-3.5" />
                  Rollback
                </Button>
              ) : null}
              <span className="text-xs text-muted-foreground">
                Letzter Draft: {new Date(latestDraft.createdAt).toLocaleString("de-DE")}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">KI-Vorschläge</CardTitle>
          <CardDescription>
            Gemini analysiert URL, Inhalt und Brand-Kontext und schlägt Keyword,
            Titel, Beschreibung und Indexierungs-Empfehlung vor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => generate()}
              disabled={loadingGen}
            >
              {loadingGen ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SparklesIcon className="size-4" />
              )}
              {suggestions.length === 0
                ? "KI-Vorschläge generieren"
                : "Neu generieren"}
            </Button>
            {suggestions.length > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setRefineDialogOpen(true)}
                disabled={loadingGen}
              >
                <RefreshCwIcon className="size-4" />
                Verfeinern
              </Button>
            ) : null}
          </div>

          {suggestions.length === 0 && !loadingGen ? (
            <p className="text-xs text-muted-foreground py-8 text-center">
              Noch keine Vorschläge. Klick „KI-Vorschläge generieren".
            </p>
          ) : null}

          {suggestions.map((s, i) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              index={i}
              onApply={() => applySuggestion(s)}
            />
          ))}
        </CardContent>
      </Card>

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Draft speichern</DialogTitle>
            <DialogDescription>
              Du bearbeitest die Primärsprache ({url.language?.toUpperCase()}).
              Optional kannst du den gleichen Draft automatisch in die {siblingForeignCount} verknüpften Fremdsprachen übersetzen lassen.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Switch
              checked={applyTranslations}
              onCheckedChange={setApplyTranslations}
              disabled={saving}
            />
            <div className="grid gap-0.5">
              <Label className="text-sm font-medium">
                Auch in {siblingForeignCount} Fremdsprache(n) übersetzen
              </Label>
              <span className="text-xs text-muted-foreground">
                Erzeugt pro Sprache einen Draft via Gemini-Übersetzung. Du
                kannst sie später einzeln öffnen, anpassen oder pushen.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSaveDialogOpen(false)}
              disabled={saving}
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => saveDraft(form.getValues(), applyTranslations)}
              disabled={saving}
            >
              {saving ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SaveIcon className="size-4" />
              )}
              Speichern
              {applyTranslations
                ? ` + ${siblingForeignCount} übersetzen`
                : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {latestDraft ? (
        <PushDialog
          open={pushDialogOpen}
          onOpenChange={setPushDialogOpen}
          url={url}
          draft={latestDraft}
          onSuccess={() => router.refresh()}
        />
      ) : null}

      <RollbackDialog
        open={rollbackDialogOpen}
        onOpenChange={setRollbackDialogOpen}
        urlId={url.id}
        onSuccess={() => router.refresh()}
      />

      <Dialog open={refineDialogOpen} onOpenChange={setRefineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vorschläge verfeinern</DialogTitle>
            <DialogDescription>
              Beschreibe in einem Satz, wie die Vorschläge angepasst werden
              sollen — z. B. „kürzer und technischer" oder „stärker auf
              Industrieanwendung fokussiert".
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={refinementHint}
            onChange={(e) => setRefinementHint(e.target.value)}
            placeholder="kürzer, technischer ..."
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setRefineDialogOpen(false)}
              disabled={loadingGen}
            >
              Abbrechen
            </Button>
            <Button
              onClick={async () => {
                setRefineDialogOpen(false);
                await generate({ hint: refinementHint });
                setRefinementHint("");
              }}
              disabled={loadingGen || refinementHint.trim().length === 0}
            >
              Verfeinern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CurrentValues({ url }: { url: Url }) {
  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        Aktuelle Yoast-Werte
      </div>
      <Field
        label="SEO-Titel"
        value={url.currentSeoTitle}
        hint={url.currentSeoTitle ? `${url.currentSeoTitle.length} Zeichen` : null}
      />
      <Field
        label="Meta-Desc"
        value={url.currentMetaDesc}
        hint={url.currentMetaDesc ? `${url.currentMetaDesc.length} Zeichen` : null}
      />
      <Field label="Focus-KW" value={url.currentFocusKeyword} />
    </div>
  );
}

function Field({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint?: string | null;
}) {
  return (
    <div className="grid grid-cols-[5rem_1fr] gap-2 text-xs">
      <div className="text-muted-foreground">{label}</div>
      <div className="break-words text-foreground/80">
        {value || <em className="text-muted-foreground">leer</em>}
        {hint ? <span className="ml-2 text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}

function FieldRow({
  label,
  counter,
  children,
}: {
  label: string;
  counter?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        {counter}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
      <div className="grid gap-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  index,
  onApply,
}: {
  suggestion: Suggestion;
  index: number;
  onApply: () => void;
}) {
  return (
    <div className="rounded-md border p-3 space-y-2 hover:border-foreground/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            Variante {index + 1}
          </Badge>
          {suggestion.noindex ? (
            <Badge variant="destructive" className="text-[10px]">
              noindex
            </Badge>
          ) : null}
          {suggestion.nofollow ? (
            <Badge variant="destructive" className="text-[10px]">
              nofollow
            </Badge>
          ) : null}
        </div>
        <Button type="button" size="xs" onClick={onApply}>
          <CheckIcon className="size-3" />
          Übernehmen
        </Button>
      </div>
      <div className="space-y-1.5 text-sm">
        <div>
          <span className="text-xs text-muted-foreground">Keyword: </span>
          <span className="font-medium">{suggestion.focusKeyword}</span>
          {suggestion.longtailKeywords.length > 0 ? (
            <span className="ml-2 text-xs text-muted-foreground">
              + {suggestion.longtailKeywords.join(", ")}
            </span>
          ) : null}
        </div>
        <div className="font-medium leading-snug">{suggestion.seoTitle}</div>
        <div className="text-sm leading-snug text-muted-foreground">
          {suggestion.metaDescription}
        </div>
        {suggestion.reasoning ? (
          <div className="text-xs italic text-muted-foreground border-l-2 pl-2 border-muted">
            {suggestion.reasoning}
          </div>
        ) : null}
      </div>
    </div>
  );
}
