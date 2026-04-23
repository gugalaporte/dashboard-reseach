"use client";

import { cn } from "@/lib/utils";
import { FONTES } from "@/lib/queries";

interface Props {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}

// Grupo de pills estilo terminal. "Todas" = valor undefined.
const OPTIONS: { value: string | undefined; label: string }[] = [
  { value: undefined, label: "Todas" },
  ...FONTES.map((f) => ({
    value: f,
    label: f === "BTG Pactual" ? "BTG" : f === "Bradesco BBI" ? "BBI" : "Safra",
  })),
];

export function SourceFilter({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-surface p-1">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 h-8 rounded text-[11px] font-medium uppercase tracking-[0.08em] transition",
              active
                ? "bg-navy text-surface-soft"
                : "text-ink/60 hover:text-ink"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
