import { Badge } from "@/components/ui/badge";
import type { Url } from "@/lib/db/schema";

const LABELS: Record<Url["status"], string> = {
  pending: "Ausstehend",
  optimized: "Optimiert",
  draft: "Entwurf",
  pushed: "Gepusht",
  error: "Fehler",
};

const VARIANTS: Record<Url["status"], "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  optimized: "secondary",
  draft: "default",
  pushed: "default",
  error: "destructive",
};

export function StatusBadge({ status }: { status: Url["status"] }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
