"use client";

import { cn } from "@/lib/utils";
import type { PeriodoFilter } from "@/types/research";

interface Props {
  value: PeriodoFilter;
  onChange: (value: PeriodoFilter) => void;
}

const OPTIONS: { value: PeriodoFilter; label: string }[] = [
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "all", label: "Tudo" },
];

export function DateFilter({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-surface p-1">
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
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
