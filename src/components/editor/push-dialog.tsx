"use client";

import { AlertTriangleIcon, Loader2Icon, SendIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Draft, Url } from "@/lib/db/schema";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: Url;
  draft: Draft;
  onSuccess: () => void;
};

export function PushDialog({ open, onOpenChange, url, draft, onSuccess }: Props) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/urls/${url.id}/push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? `Push fehlgeschlagen (${res.status})`);
        return;
      }
      toast.success("Erfolgreich nach WordPress gepusht");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(`Netzwerkfehler: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nach WordPress pushen</DialogTitle>
          <DialogDescription>
            Folgende Yoast-Felder werden in WordPress überschrieben. Vorher wird
            automatisch ein Backup angelegt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <Diff
            label="SEO-Titel"
            before={url.currentSeoTitle}
            after={draft.seoTitle}
          />
          <Diff
            label="Meta-Description"
            before={url.currentMetaDesc}
            after={draft.metaDescription}
          />
          <Diff
            label="Focus-Keyword"
            before={url.currentFocusKeyword}
            after={draft.focusKeyword}
          />
          <RobotsDiff
            label="noindex"
            before={url.currentMetaRobotsNoindex}
            after={draft.noindex}
          />
          <RobotsDiff
            label="nofollow"
            before={url.currentMetaRobotsNofollow}
            after={draft.nofollow}
          />
        </div>

        <div className="flex items-center gap-2 rounded-md border border-amber-300/40 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs">
          <AlertTriangleIcon className="size-3.5 text-amber-700 dark:text-amber-400" />
          <span>
            Backup wird automatisch vor dem Push angelegt. Rollback ist
            anschließend möglich.
          </span>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Abbrechen
          </Button>
          <Button onClick={run} disabled={busy}>
            {busy ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SendIcon className="size-4" />
            )}
            Jetzt pushen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Diff({
  label,
  before,
  after,
}: {
  label: string;
  before: string | null;
  after: string | null;
}) {
  const unchanged = (before ?? "") === (after ?? "");
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="rounded-md border bg-muted/20 px-3 py-1.5 text-xs">
        <span className="text-muted-foreground">Bisher: </span>
        <span className="break-words">
          {before || <em className="text-muted-foreground">(leer)</em>}
        </span>
      </div>
      <div
        className={
          unchanged
            ? "rounded-md border bg-muted/20 px-3 py-1.5 text-xs"
            : "rounded-md border border-emerald-300/40 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs"
        }
      >
        <span className="text-muted-foreground">Neu: </span>
        <span className="break-words font-medium">
          {after || <em className="text-muted-foreground">(leer)</em>}
        </span>
        {unchanged ? (
          <span className="ml-2 text-[10px] text-muted-foreground">
            (unverändert)
          </span>
        ) : null}
      </div>
    </div>
  );
}

function RobotsDiff({
  label,
  before,
  after,
}: {
  label: string;
  before: boolean;
  after: boolean;
}) {
  const unchanged = before === after;
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="w-24 font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-muted-foreground">
        {before ? "ja" : "nein"}{" "}
        <span className="mx-1 text-muted-foreground/60">→</span>{" "}
        <span className={unchanged ? "" : "font-semibold"}>
          {after ? "ja" : "nein"}
        </span>
      </div>
    </div>
  );
}
