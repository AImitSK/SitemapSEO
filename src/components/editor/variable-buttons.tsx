"use client";

import { Button } from "@/components/ui/button";

type Props = {
  onInsert: (variable: string) => void;
};

const VARIABLES: Array<{ label: string; value: string; description: string }> = [
  {
    label: "%%sitename%%",
    value: "%%sitename%%",
    description: "Wird durch den Site-Namen ersetzt",
  },
  {
    label: "%%sep%%",
    value: "%%sep%%",
    description: "Yoast-Trennzeichen (z. B. „ - “)",
  },
];

export function VariableButtons({ onInsert }: Props) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">Einfügen:</span>
      {VARIABLES.map((v) => (
        <Button
          key={v.value}
          type="button"
          variant="outline"
          size="xs"
          onClick={() => onInsert(v.value)}
          title={v.description}
        >
          <span className="font-mono">{v.label}</span>
        </Button>
      ))}
    </div>
  );
}
