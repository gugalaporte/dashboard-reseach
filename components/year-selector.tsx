"use client";

import { cn } from "@/lib/utils";

type Props = {
  years: string[];
  /** null = todos os anos. */
  value: string | null;
  onChange: (year: string | null) => void;
};

export function YearSelector({ years, value, onChange }: Props) {
  const active = value && years.includes(value) ? value : null;

  return (
    <div className="flex items-center gap-1 rounded-md bg-surface p-1 flex-wrap">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={cn(
          "px-3 h-8 rounded text-[11px] font-medium uppercase tracking-[0.08em] transition",
          active === null
            ? "bg-navy text-surface-soft"
            : "text-ink/60 hover:text-ink"
        )}
      >
        Todos
      </button>
      {years.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => onChange(active === y ? null : y)}
          className={cn(
            "px-3 h-8 rounded text-[11px] font-medium uppercase tracking-[0.08em] transition",
            active === y
              ? "bg-navy text-surface-soft"
              : "text-ink/60 hover:text-ink"
          )}
        >
          {y}E
        </button>
      ))}
    </div>
  );
}
