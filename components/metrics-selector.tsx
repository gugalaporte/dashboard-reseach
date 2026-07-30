"use client";

import { cn } from "@/lib/utils";
import {
  METRICS,
  MAX_SELECTED_METRICS,
  type MetricDef,
  type MetricId,
} from "@/lib/metrics";

interface Props {
  value: MetricId[];
  onChange: (value: MetricId[]) => void;
  /** Catálogo exibido (default = Research). */
  metrics?: MetricDef[];
}

export function MetricsSelector({
  value,
  onChange,
  metrics = METRICS,
}: Props) {
  function toggle(id: MetricId) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
      return;
    }
    if (value.length >= MAX_SELECTED_METRICS) {
      onChange([...value.slice(1), id]);
      return;
    }
    onChange([...value, id]);
  }

  return (
    <div className="flex items-center gap-1 rounded-md bg-surface p-1 flex-wrap">
      {metrics.map((m) => {
        const active = value.includes(m.id);
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle(m.id)}
            className={cn(
              "px-3 h-8 rounded text-[11px] font-medium uppercase tracking-[0.08em] transition",
              active
                ? "bg-navy text-surface-soft"
                : "text-ink/60 hover:text-ink"
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
