"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { formatNumber } from "@/lib/format";
import {
  FACTOR_FORMULA,
  FACTOR_LABELS,
  DEFAULT_WEIGHT_PCT,
  weightsFromPct,
  type FactorClass,
  type FactorId,
  type FactorRow,
  type FactorWeightPct,
  type MetricBreakdown,
} from "@/lib/factor-scoring";
import {
  factorRankOf,
  formatFactorNominal,
  formatMetricRaw,
  formatRank,
  formatScore,
} from "@/lib/factor-display";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function metricsForFactor(
  row: FactorRow,
  factor: FactorId
): MetricBreakdown[] {
  return row.breakdown.filter((m) => m.factor === factor);
}

/** Tooltip no hover via portal (não corta em tabela com overflow). */
function HoverTip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
}) {
  const anchorRef = React.useRef<HTMLSpanElement>(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  const show = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.top - 8, left: r.left + r.width / 2 });
    setOpen(true);
  };

  return (
    <span
      ref={anchorRef}
      className="inline-flex justify-center"
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
      onFocus={show}
      onBlur={() => setOpen(false)}
    >
      <span className="cursor-help border-b border-dotted border-ink/25">{children}</span>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            className={cn(
              "fixed z-[100] -translate-x-1/2 -translate-y-full pointer-events-none",
              "w-72 max-w-[min(18rem,calc(100vw-1.5rem))] rounded-sm border border-line bg-navy text-surface-soft",
              "px-3 py-2.5 text-left text-[11px] leading-relaxed shadow-lg"
            )}
            style={{ top: pos.top, left: pos.left }}
          >
            {content}
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-navy" />
          </span>,
          document.body
        )}
    </span>
  );
}

function FactorTipBody({ row, factor }: { row: FactorRow; factor: FactorId }) {
  const metrics = metricsForFactor(row, factor);
  const rank = factorRankOf(row, factor);

  return (
    <div className="space-y-2">
      <p className="text-surface-soft/70 text-[10px] leading-snug">{FACTOR_FORMULA[factor]}</p>
      {metrics.length === 0 ? (
        <p className="text-surface-soft/50">sem dados para este fator</p>
      ) : (
        <ul className="space-y-0.5 font-mono tabular text-[10px]">
          {metrics.map((m) => (
            <li key={m.key} className="flex justify-between gap-3">
              <span className="text-surface-soft/75 truncate">
                {m.label}
                {m.inverted ? " (menor é melhor)" : ""}
              </span>
              <span className="shrink-0 text-surface-soft/90">
                {m.raw == null ? (
                  <span className="text-surface-soft/45">sem dado</span>
                ) : m.factor === "value" && m.raw <= 0 ? (
                  <span className="text-surface-soft/45">ignorado (≤0)</span>
                ) : (
                  formatMetricRaw(m.key, m.raw)
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="pt-1 border-t border-surface-soft/15 font-semibold tabular">
        {FACTOR_LABELS[factor]} = {formatFactorNominal(row, factor)}
        {rank != null ? ` · ${formatRank(rank)}` : ""}
      </p>
    </div>
  );
}

function ScoreTipBody({
  row,
  weights,
}: {
  row: FactorRow;
  weights: FactorWeightPct;
}) {
  const w = weightsFromPct(weights);
  const parts = (
    [
      { id: "quality" as const, w: w.quality, v: row.quality },
      { id: "value" as const, w: w.value, v: row.value },
      { id: "momentum" as const, w: w.momentum, v: row.momentum },
      { id: "carry" as const, w: w.carry, v: row.carry },
    ] satisfies { id: FactorId; w: number; v: number | null }[]
  ).filter((p) => p.w > 0);
  const present = parts.filter((p) => p.v != null);
  const wSum = present.reduce((a, p) => a + p.w, 0);
  const pct = (x: number) => `${formatNumber(x * 100, 0)}%`;

  return (
    <div className="space-y-2">
      <p className="text-surface-soft/70 text-[10px] leading-snug">
        Score composto pelos rankings (1º = 100) de Quality×{pct(w.quality)} +
        Value×{pct(w.value)} + Carry×{pct(w.carry)} + Momentum×{pct(w.momentum)}
        (renormaliza se faltar fator ou se a soma ≠ 100%).
      </p>
      <ul className="space-y-0.5 font-mono tabular text-[10px]">
        {parts.map((p) => (
          <li key={p.id} className="flex justify-between gap-3">
            <span className="text-surface-soft/75">
              {FACTOR_LABELS[p.id]}×{pct(p.w)}
            </span>
            <span>
              {p.v == null ? (
                <span className="text-surface-soft/45">sem dado</span>
              ) : (
                <>
                  {formatFactorNominal(row, p.id)}
                  {factorRankOf(row, p.id) != null
                    ? ` ${formatRank(factorRankOf(row, p.id))}`
                    : ""}
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
      {present.length > 0 && wSum > 0 && (
        <p className="text-[10px] text-surface-soft/55 leading-snug">
          {present
            .map(
              (p) =>
                `${FACTOR_LABELS[p.id]}×${pct(p.w / wSum)}`
            )
            .join(" + ")}
        </p>
      )}
      <p className="pt-1 border-t border-surface-soft/15 font-semibold tabular">
        = {formatScore(row.score)}
      </p>
    </div>
  );
}

function PercentileTipBody({
  row,
  eligibleInView,
  percentile,
}: {
  row: FactorRow;
  eligibleInView: number;
  percentile: number | null | undefined;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-surface-soft/70 text-[10px] leading-snug">
        Percentil do score composto entre as empresas elegíveis do screening atual
        (respeitando os filtros ativos).
      </p>
      <p className="font-mono tabular text-[10px]">
        Score {formatScore(row.score)} · percentil{" "}
        {percentile != null ? formatNumber(percentile, 0) : "–"}
      </p>
      <p className="text-surface-soft/55 text-[10px]">
        Universo filtrado: {eligibleInView} elegível{eligibleInView === 1 ? "" : "eis"}
      </p>
    </div>
  );
}

export function FactorScoreCell({
  row,
  factor,
}: {
  row: FactorRow;
  factor: FactorId;
}) {
  return (
    <HoverTip content={<FactorTipBody row={row} factor={factor} />}>
      <span className="inline-flex items-baseline justify-center gap-1">
        <span className="tabular text-sm">{formatFactorNominal(row, factor)}</span>
        {factorRankOf(row, factor) != null && (
          <span className="text-[9px] tabular text-ink/40 font-medium">
            {formatRank(factorRankOf(row, factor))}
          </span>
        )}
      </span>
    </HoverTip>
  );
}

export function CompositeScoreCell({
  row,
  weights = DEFAULT_WEIGHT_PCT,
}: {
  row: FactorRow;
  weights?: FactorWeightPct;
}) {
  return (
    <HoverTip content={<ScoreTipBody row={row} weights={weights} />}>
      <span className="tabular text-sm font-semibold text-ink">{formatScore(row.score)}</span>
    </HoverTip>
  );
}

export function PercentileCell({
  row,
  eligibleInView,
  percentile,
}: {
  row: FactorRow;
  eligibleInView: number;
  /** Percentil no universo filtrado atual (preferível ao row.percentile global). */
  percentile?: number | null;
}) {
  const p = percentile ?? row.percentile;
  return (
    <HoverTip
      content={
        <PercentileTipBody
          row={row}
          eligibleInView={eligibleInView}
          percentile={p}
        />
      }
    >
      <span className="tabular text-xs text-ink/60">
        {p != null ? formatNumber(p, 0) : "–"}
      </span>
    </HoverTip>
  );
}

function ClassTipBody({ row }: { row: FactorRow }) {
  const p = row.percentile;
  return (
    <div className="space-y-2">
      <p className="text-surface-soft/70 text-[10px] leading-snug">
        Classe pelo percentil do score composto entre as empresas exibidas
        (filtros atuais da tela).
      </p>
      <ul className="space-y-0.5 font-mono tabular text-[10px]">
        <li className="flex justify-between gap-3">
          <span className="text-surface-soft/75">A</span>
          <span>percentil ≥ 75 (top 25%)</span>
        </li>
        <li className="flex justify-between gap-3">
          <span className="text-surface-soft/75">B</span>
          <span>25 ≤ percentil &lt; 75</span>
        </li>
        <li className="flex justify-between gap-3">
          <span className="text-surface-soft/75">C</span>
          <span>percentil &lt; 25 (bottom 25%)</span>
        </li>
      </ul>
      <p className="pt-1 border-t border-surface-soft/15 font-semibold tabular">
        Score {formatScore(row.score)} · percentil{" "}
        {p != null ? formatNumber(p, 0) : "–"} → Classe {row.factorClass ?? "–"}
      </p>
    </div>
  );
}

const CLASS_BADGE_STYLES: Record<FactorClass, string> = {
  A: "bg-brand/10 text-brand border-brand/30",
  B: "bg-surface text-ink/70 border-line",
  C: "bg-destructive/10 text-destructive border-destructive/25",
};

export function ClassCell({ row }: { row: FactorRow }) {
  const c = row.factorClass;
  if (!c) return <span className="text-ink/30">–</span>;
  return (
    <HoverTip content={<ClassTipBody row={row} />}>
      <Badge
        variant="outline"
        className={cn("font-semibold tabular text-[11px]", CLASS_BADGE_STYLES[c])}
      >
        {c}
      </Badge>
    </HoverTip>
  );
}
