"use client";

import * as React from "react";
import { AppHeader } from "@/components/app-header";
import { PipelineStageBar } from "@/components/pipeline-stage-bar";
import { PipelineCompanyCard } from "@/components/pipeline-company-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  countByPipeline,
  defaultPipelineStage,
  emptyPipelineCounts,
  type PipelineNote,
} from "@/lib/pipeline";
import { PIPELINE_STEPS, type PipelineStatus } from "@/lib/bottom-up-types";
import { useLivePrices } from "@/lib/use-live-prices";

export function PipelineDashboard() {
  const [notes, setNotes] = React.useState<PipelineNote[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stage, setStage] = React.useState<PipelineStatus | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/pipeline", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) setNotes(json as PipelineNote[]);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao carregar pipeline");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = React.useMemo(() => countByPipeline(notes), [notes]);
  const active = stage ?? defaultPipelineStage(counts);
  const visible = notes.filter((n) => n.status === active);
  const stepLabel =
    PIPELINE_STEPS.find((s) => s.id === active)?.label ?? active;
  const lastUpdate = notes[0]?.updatedAt ?? null;
  const tickers = React.useMemo(
    () => notes.map((n) => n.ticker),
    [notes]
  );
  const { prices: livePrices } = useLivePrices(tickers);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader active="pipeline" subtitle="Pipeline" lastUpdate={lastUpdate} />

      <div className="bg-surface-soft border-b border-line">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-4 md:py-5 space-y-3">
          <p className="text-xs text-ink/45">
            Empresas salvas na aba Tese do screening, agrupadas pela etapa do
            pipeline.
          </p>
          <PipelineStageBar
            value={active}
            counts={loading ? emptyPipelineCounts() : counts}
            onChange={setStage}
          />
        </div>
      </div>

      <main className="flex-1 mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-5 md:py-8 space-y-4">
        {error && (
          <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3">
            {error}
          </p>
        )}

        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-lg text-ink tracking-tight">
            {stepLabel}
          </h2>
          <span className="text-[11px] uppercase tracking-[0.12em] text-ink/45 tabular">
            {visible.length} {visible.length === 1 ? "empresa" : "empresas"}
          </span>
        </div>

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <p className="text-sm text-ink/50 border border-line bg-white px-4 py-8 text-center">
            Nenhuma empresa nesta etapa. No screening, abra o papel → Tese e
            escolha o pipeline.
          </p>
        )}

        {visible.map((note) => (
          <PipelineCompanyCard
            key={note.ticker}
            note={note}
            close={livePrices.get(note.ticker)}
          />
        ))}
      </main>
    </div>
  );
}
