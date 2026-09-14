"use client";

import { Input } from "@/components/ui/input";
import { DEFAULT_WEIGHT_PCT, type FactorWeightPct } from "@/lib/factor-scoring";
import { cn } from "@/lib/utils";

const FIELDS: Array<{ key: keyof FactorWeightPct; label: string }> = [
  { key: "quality", label: "Quality" },
  { key: "value", label: "Value" },
  { key: "carry", label: "Carry" },
  { key: "momentum", label: "Momentum" },
];

type Props = {
  values: Record<keyof FactorWeightPct, string>;
  onChange: (key: keyof FactorWeightPct, value: string) => void;
};

/** Inputs de peso % do score composto. Recalcular aplica. */
export function FactorWeightInputs({ values, onChange }: Props) {
  const sum = FIELDS.reduce((a, f) => a + (Number(values[f.key]) || 0), 0);
  const ok = Math.abs(sum - 100) < 0.5;

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      <span className="text-[10px] uppercase tracking-[0.18em] text-ink/50 font-medium w-full sm:w-auto shrink-0">
        Pesos
      </span>
      {FIELDS.map((f) => (
        <label
          key={f.key}
          className="flex items-center gap-1.5 text-xs text-ink/55"
        >
          <span className="shrink-0">{f.label}</span>
          <Input
            className="h-8 w-14 text-xs tabular border-line bg-surface px-2"
            value={values[f.key]}
            onChange={(e) => onChange(f.key, e.target.value)}
            inputMode="decimal"
            aria-label={`Peso ${f.label} %`}
          />
          <span className="text-ink/35">%</span>
        </label>
      ))}
      <span
        className={cn(
          "text-[11px] tabular",
          ok ? "text-ink/40" : "text-ink/70"
        )}
      >
        Soma {sum}%
        {!ok && " · renormaliza"}
      </span>
    </div>
  );
}

export function defaultWeightInputs(): Record<keyof FactorWeightPct, string> {
  return {
    quality: String(DEFAULT_WEIGHT_PCT.quality),
    value: String(DEFAULT_WEIGHT_PCT.value),
    carry: String(DEFAULT_WEIGHT_PCT.carry),
    momentum: String(DEFAULT_WEIGHT_PCT.momentum),
  };
}
