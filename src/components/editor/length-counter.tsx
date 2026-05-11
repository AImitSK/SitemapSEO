import { cn } from "@/lib/utils";

type Kind = "seo-title" | "meta-desc";

const RANGES: Record<Kind, { min: number; max: number }> = {
  "seo-title": { min: 50, max: 60 },
  "meta-desc": { min: 140, max: 160 },
};

function classify(len: number, kind: Kind): "empty" | "short" | "good" | "long" {
  if (len === 0) return "empty";
  const { min, max } = RANGES[kind];
  if (len < min) return "short";
  if (len > max) return "long";
  return "good";
}

const STYLES: Record<ReturnType<typeof classify>, string> = {
  empty: "bg-muted text-muted-foreground",
  short: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200",
  good: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  long: "bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-200",
};

export function LengthCounter({
  length,
  kind,
}: {
  length: number;
  kind: Kind;
}) {
  const cls = classify(length, kind);
  const range = RANGES[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums",
        STYLES[cls],
      )}
      title={`Optimal: ${range.min}–${range.max} Zeichen`}
    >
      {length}
      <span className="text-[10px] opacity-60">/ {range.min}–{range.max}</span>
    </span>
  );
}
