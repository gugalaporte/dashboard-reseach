"use client";

import { Star } from "lucide-react";
import { ClassCell } from "@/components/factor-cell-tip";
import { defaultCcyForTicker, sameCcy } from "@/lib/currency";
import { formatDateShort, formatValue } from "@/lib/format";
import { formatScore } from "@/lib/factor-display";
import type { FactorRow } from "@/lib/factor-scoring";
import type { ResearchRow } from "@/lib/queries";
import type { LsegViewRow } from "@/lib/lseg-transform";
import type { LivePrice } from "@/lib/use-live-prices";
import { cn } from "@/lib/utils";

type Props = {
  ticker: string;
  lseg: LsegViewRow | null;
  factor: FactorRow | null;
  consenso: ResearchRow[];
  live?: LivePrice;
};

function Kpi({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="border border-line bg-white px-3 py-3 min-w-0">
      <div className="text-[10px] uppercase tracking-[0.14em] text-ink/45">
        {label}
      </div>
      <div className={cn("font-mono tabular text-base mt-1", valueClass)}>
        {value}
      </div>
      {hint ? <div className="text-[10px] text-ink/40 mt-0.5">{hint}</div> : null}
    </div>
  );
}

/** Faixa de KPIs no topo da página da empresa. */
export function EmpresaOverview({ ticker, lseg, factor, consenso, live }: Props) {
  const ccy = live
    ? live.currency === "BRL"
      ? "R$"
      : live.currency
    : defaultCcyForTicker(ticker);
  const price = live?.price ?? lseg?.price?.value ?? consenso[0]?.price?.value ?? null;
  const target =
    lseg?.target ?? consenso.find((c) => c.target)?.target ?? null;
  const upside =
    price != null && target && sameCcy(target.ccy, ccy)
      ? ((target.value - price) / price) * 100
      : null;
  const rating =
    lseg?.rating?.value ?? consenso.find((c) => c.rating)?.rating?.value ?? null;
  const pe = lseg?.pe?.value ?? factor?.raw.peFwd ?? null;
  const ev = lseg?.ev_ebitda?.value ?? factor?.raw.evEbitda ?? null;
  const dy = lseg?.dy?.value ?? factor?.raw.dividendYield ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {factor?.inPortfolio || lseg?.inPortfolio ? (
          <span className="inline-flex items-center gap-1 h-6 px-2 border border-amber-200 bg-amber-50 text-[10px] uppercase tracking-[0.1em] text-amber-800">
            <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
            Em carteira
          </span>
        ) : null}
        {factor ? <ClassCell row={factor} /> : null}
        {factor?.score != null ? (
          <span className="text-xs text-ink/55">
            Score {formatScore(factor.score)}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Kpi
          label="Fechamento"
          value={price != null ? formatValue(price, "money", ccy) : "–"}
          hint={
            live?.asOf
              ? formatDateShort(live.asOf)
              : lseg?.price?.date
                ? formatDateShort(lseg.price.date)
                : undefined
          }
        />
        <Kpi
          label="Target"
          value={
            target ? formatValue(target.value, "money", target.ccy) : "–"
          }
        />
        <Kpi
          label="Upside"
          value={
            upside == null
              ? "–"
              : `${upside >= 0 ? "+" : ""}${upside.toFixed(1)}%`
          }
          valueClass={
            upside == null
              ? "text-ink/35"
              : upside >= 0
                ? "text-emerald-700"
                : "text-red-700"
          }
        />
        <Kpi label="Rating" value={rating ?? "–"} />
        <Kpi
          label="P/E"
          value={pe != null ? `${pe.toFixed(1)}x` : "–"}
        />
        <Kpi
          label={dy != null ? "DY" : "EV/EBITDA"}
          value={
            dy != null
              ? `${dy.toFixed(1)}%`
              : ev != null
                ? `${ev.toFixed(1)}x`
                : "–"
          }
        />
      </div>
    </div>
  );
}
