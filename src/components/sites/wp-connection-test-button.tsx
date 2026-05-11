"use client";

import { CheckCircle2Icon, Loader2Icon, PlugIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type TestResult = {
  ok: boolean;
  user?: { id: number; name: string; slug: string };
  muPluginInstalled: boolean | null;
  yoastFieldsExposed: boolean | null;
  error?: string;
};

export function WpConnectionTestButton({ siteId }: { siteId: string }) {
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    try {
      const res = await fetch(`/api/sites/${siteId}/test-connection`, {
        method: "POST",
      });
      const data = (await res.json()) as TestResult;
      if (!data.ok) {
        toast.error(data.error ?? "Verbindungstest fehlgeschlagen.");
        return;
      }
      const userLabel = data.user
        ? `${data.user.name} (#${data.user.id})`
        : "unbekannt";
      if (data.muPluginInstalled === true) {
        toast.success("Verbindung OK – mu-Plugin erkannt.", {
          description: `Angemeldet als ${userLabel}.`,
        });
      } else if (data.muPluginInstalled === false) {
        toast.warning("Verbindung OK – mu-Plugin fehlt.", {
          description: `Yoast-Felder noch nicht REST-sichtbar. Plugin herunterladen und installieren.`,
        });
      } else {
        toast.message("Verbindung OK – mu-Plugin-Status unklar.", {
          description: `Angemeldet als ${userLabel}. Status kann erst nach dem ersten Sync verlässlich geprüft werden.`,
        });
      }
    } catch (err) {
      toast.error(`Netzwerkfehler: ${(err as Error).message}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <Button onClick={run} disabled={running} variant="secondary">
      {running ? (
        <Loader2Icon className="size-4 animate-spin" />
      ) : (
        <PlugIcon className="size-4" />
      )}
      WP-Verbindung testen
      {!running ? <CheckCircle2Icon className="size-4 opacity-50" /> : null}
    </Button>
  );
}
