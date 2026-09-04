"use client";

import { PIPELINE_STEPS, type PipelineStatus } from "@/lib/bottom-up-types";
import type { PipelineCounts } from "@/lib/pipeline";
import { cn } from "@/lib/utils";

type Props = {
  value: PipelineStatus;
  counts: PipelineCounts;
  onChange: (status: PipelineStatus) => void;
};

/** Quatro etapas do pipeline com contagem de empresas. */
export function PipelineStageBar({ value, counts, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {PIPELINE_STEPS.map((step, i) => {
        const active = value === step.id;
        return (
          <button
            key={step.id}
            type="button"
            onClick={() => onChange(step.id)}
            className={cn(
              "text-left border px-4 py-3 transition",
              active
                ? "bg-navy text-surface-soft border-navy"
                : "bg-white text-ink border-line hover:border-ink/30"
            )}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[10px] uppercase tracking-[0.14em] font-medium">
                {String(i + 1).padStart(2, "0")} · {step.label}
              </span>
              <span
                className={cn(
                  "font-mono text-lg tabular",
                  active ? "text-surface-soft" : "text-ink"
                )}
              >
                {counts[step.id]}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
