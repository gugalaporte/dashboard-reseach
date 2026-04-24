"use client";

import { cn } from "@/lib/utils";
import { METRICS, MAX_SELECTED_METRICS, type MetricId } from "@/lib/metrics";

interface Props {
  value: MetricId[]; // ordem preservada (primeiro -> mais antigo)
  onChange: (value: MetricId[]) => void;
}

// Seletor multi-toggle de metricas. Limite = MAX_SELECTED_METRICS.
// Comportamento quando atinge o limite: clicar em uma metrica nao selecionada
// remove a MAIS ANTIGA (FIFO) e adiciona a nova no fim.
export function MetricsSelector({ value, onChange }: Props) {
  function toggle(id: MetricId) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
      return;
    }
    if (value.length >= MAX_SELECTED_METRICS) {
      // FIFO: remove o mais antigo, adiciona no fim.
      onChange([...value.slice(1), id]);
      return;
    }
    onChange([...value, id]);
  }

  return (
    <div className="flex items-center gap-1 rounded-md bg-surface p-1 flex-wrap">
      {METRICS.map((m) => {
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
