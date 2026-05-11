"use client";

import { DownloadCloudIcon, Loader2Icon, RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type ImportResult = {
  ok: boolean;
  parsed?: number;
  inserted?: number;
  updated?: number;
  skipped?: number;
  durationMs?: number;
  error?: string;
};

type SyncResult = {
  ok: boolean;
  fetched?: number;
  matched?: number;
  unmatched?: number;
  perType?: Record<string, { fetched: number; matched: number }>;
  durationMs?: number;
  error?: string;
};

function formatDuration(ms: number | undefined): string {
  if (!ms) return "";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function SiteSyncActions({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function runImport() {
    setImporting(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/import-sitemap`, {
        method: "POST",
      });
      const data = (await res.json()) as ImportResult;
      if (!data.ok) {
        toast.error(data.error ?? "Sitemap-Import fehlgeschlagen");
        return;
      }
      toast.success("Sitemap importiert", {
        description: `${data.parsed} URLs gelesen · ${data.inserted} neu · ${data.updated} aktualisiert (${formatDuration(data.durationMs)})`,
      });
      router.refresh();
    } catch (err) {
      toast.error(`Netzwerkfehler: ${(err as Error).message}`);
    } finally {
      setImporting(false);
    }
  }

  async function runSync() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/sync-from-wp`, {
        method: "POST",
      });
      const data = (await res.json()) as SyncResult;
      if (!data.ok) {
        toast.error(data.error ?? "WP-Sync fehlgeschlagen");
        return;
      }
      toast.success("WordPress synchronisiert", {
        description: `${data.matched} von ${data.fetched} Posts gemappt (${formatDuration(data.durationMs)})`,
      });
      router.refresh();
    } catch (err) {
      toast.error(`Netzwerkfehler: ${(err as Error).message}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={runImport} disabled={importing || syncing}>
        {importing ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <DownloadCloudIcon className="size-4" />
        )}
        Sitemap importieren
      </Button>
      <Button
        onClick={runSync}
        disabled={importing || syncing}
        variant="secondary"
      >
        {syncing ? (
          <Loader2Icon className="size-4 animate-spin" />
        ) : (
          <RefreshCwIcon className="size-4" />
        )}
        Mit WordPress synchronisieren
      </Button>
    </div>
  );
}
