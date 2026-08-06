"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { formatNumber } from "@/lib/format";
import { sectorPt } from "@/lib/sector-labels";
import {
  FACTOR_FORMULA,
  FACTOR_LABELS,
  FACTOR_WEIGHTS,
  type FactorId,
  type FactorRow,
  type MetricBreakdown,
} from "@/lib/factor-scoring";
import { cn } from "@/lib/utils";

function fmtZ(v: number | null): string {
  if (v == null) return "–";
  const sign = v > 0 ? "+" : "";
  return `${sign}${formatNumber(v, 2)}`;
}

function fmtRaw(key: string, v: number | null): string {
  if (v == null) return "–";
  if (key === "marketCap" || key === "dayVolume") {
    const abs = Math.abs(v);
    if (abs >= 1e9) return `${formatNumber(v / 1e9, 2)} bi`;
    if (abs >= 1e6) return `${formatNumber(v / 1e6, 1)} mi`;
    return formatNumber(v, 0);
  }
  return formatNumber(v, 2);
}

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
  const score = row[factor];
  const sector = row.sector ? sectorPt(row.sector) : "Sem setor";

  return (
    <div className="space-y-2">
      <p className="text-surface-soft/70 text-[10px] leading-snug">{FACTOR_FORMULA[factor]}</p>
      <p className="font-medium text-surface-soft">Média dos z-scores (setor: {sector})</p>
      {metrics.length === 0 ? (
        <p className="text-surface-soft/50">sem dados para este fator</p>
      ) : (
        <ul className="space-y-0.5 font-mono tabular text-[10px]">
          {metrics.map((m) => (
            <li key={m.key} className="flex justify-between gap-3">
              <span className="text-surface-soft/75 truncate">
                {m.label}
                {m.inverted ? " (inv.)" : ""}
              </span>
              <span className="shrink-0 text-surface-soft/90">
                {m.raw == null && m.z == null ? (
                  <span className="text-surface-soft/45">sem dado</span>
                ) : (
                  <>
                    {fmtRaw(m.key, m.raw)} → z{" "}
                    {m.z == null ? (
                      <span className="text-surface-soft/45">sem dado</span>
                    ) : (
                      fmtZ(m.z)
                    )}
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="pt-1 border-t border-surface-soft/15 font-semibold tabular">
        {FACTOR_LABELS[factor]} = {fmtZ(score)}
      </p>
    </div>
  );
}

function ScoreTipBody({ row }: { row: FactorRow }) {
  const parts = (
    [
      { id: "quality" as const, w: FACTOR_WEIGHTS.quality, v: row.quality },
      { id: "value" as const, w: FACTOR_WEIGHTS.value, v: row.value },
      { id: "momentum" as const, w: FACTOR_WEIGHTS.momentum, v: row.momentum },
      { id: "carry" as const, w: FACTOR_WEIGHTS.carry, v: row.carry },
      { id: "liquidity" as const, w: FACTOR_WEIGHTS.liquidity, v: row.liquidity },
    ] satisfies { id: FactorId; w: number; v: number | null }[]
  ).filter((p) => p.w > 0);
  const present = parts.filter((p) => p.v != null);
  const wSum = present.reduce((a, p) => a + p.w, 0);

  return (
    <div className="space-y-2">
      <p className="text-surface-soft/70 text-[10px] leading-snug">
        Score composto = Quality×0,30 + Value×0,30 + Carry×0,30 + Momentum×0,10
        (pesos renormalizados se faltar algum fator).
      </p>
      <ul className="space-y-0.5 font-mono tabular text-[10px]">
        {parts.map((p) => (
          <li key={p.id} className="flex justify-between gap-3">
            <span className="text-surface-soft/75">
              {FACTOR_LABELS[p.id]}×{formatNumber(p.w, 2).replace(".", ",")}
            </span>
            <span>
              {p.v == null ? (
                <span className="text-surface-soft/45">sem dado</span>
              ) : (
                fmtZ(p.v)
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
                `${FACTOR_LABELS[p.id]}×${formatNumber(p.w / wSum, 2).replace(".", ",")}`
            )
            .join(" + ")}
        </p>
      )}
      <p className="pt-1 border-t border-surface-soft/15 font-semibold tabular">
        = {fmtZ(row.score)}
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
        Score {fmtZ(row.score)} · percentil{" "}
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
      <span className="tabular text-sm">{fmtZ(row[factor])}</span>
    </HoverTip>
  );
}

export function CompositeScoreCell({ row }: { row: FactorRow }) {
  return (
    <HoverTip content={<ScoreTipBody row={row} />}>
      <span className="tabular text-sm font-semibold text-ink">{fmtZ(row.score)}</span>
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
