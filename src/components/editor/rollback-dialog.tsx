"use client";

import { Loader2Icon, Undo2Icon } from "lucide-react";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urlId: string;
  onSuccess: () => void;
};

export function RollbackDialog({ open, onOpenChange, urlId, onSuccess }: Props) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/urls/${urlId}/rollback`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? `Rollback fehlgeschlagen (${res.status})`);
        return;
      }
      toast.success("Rollback erfolgreich");
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rollback durchführen</DialogTitle>
          <DialogDescription>
            Das letzte Backup wird in WordPress wiederhergestellt. Der zuletzt
            gepushte Draft bleibt als Historie in der DB erhalten, ist aber nicht
            mehr live.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Abbrechen
          </Button>
          <Button onClick={run} disabled={busy} variant="destructive">
            {busy ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <Undo2Icon className="size-4" />
            )}
            Rollback ausführen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
