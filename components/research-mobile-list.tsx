"use client";

import { Star } from "lucide-react";
import { RatingCell } from "@/components/rating-cell";
import { TargetCell } from "@/components/target-cell";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  defaultCcyForTicker,
  FONTE_SHORT_LABEL,
  type ResearchRow,
} from "@/lib/queries";
import type { LivePricesMap } from "@/lib/use-live-prices";
import { formatValue } from "@/lib/format";
import { getMetricDef, type MetricId } from "@/lib/metrics";
import { sectorPt } from "@/lib/sector-labels";

type Props = {
  data: ResearchRow[];
  isLoading: boolean;
  onRowClick?: (row: ResearchRow) => void;
  livePrices?: LivePricesMap;
  portfolioTickers?: string[];
  selectedMetrics?: MetricId[];
  /** Anos com dado por métrica (já filtrados). */
  yearsByMetric?: Partial<Record<MetricId, string[]>>;
};

function shortYear(year: string): string {
  return year.length === 4 ? `${year.slice(2)}E` : `${year}E`;
}

/**
 * Lista compacta para mobile — ticker, rating, preço/target, métricas e fonte.
 * Toque abre o mesmo drawer da tabela desktop.
 */
export function ResearchMobileList({
  data,
  isLoading,
  onRowClick,
  livePrices,
  portfolioTickers = [],
  selectedMetrics = [],
  yearsByMetric = {},
}: Props) {
  const portfolioSet = new Set(portfolioTickers);

  if (isLoading) {
    return (
      <div className="space-y-2 md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="md:hidden rounded-lg border border-line bg-surface-soft py-16 text-center px-4">
        <p className="font-display text-lg text-ink/70">Nenhuma empresa corresponde</p>
        <p className="mt-1 text-sm text-ink/50">Ajuste os filtros ou busque por outro ticker.</p>
      </div>
    );
  }

  return (
    <ul className="md:hidden space-y-2">
      {data.map((row) => {
        const live = livePrices?.get(row.empresa);
        const price = live?.price ?? row.price?.value ?? null;
        const priceCcy =
          live?.currency === "BRL"
            ? "R$"
            : live?.currency ?? defaultCcyForTicker(row.empresa);
        const fonteLabel =
          FONTE_SHORT_LABEL[row.fonte as keyof typeof FONTE_SHORT_LABEL] ??
          row.fonte;
        const isPortfolio = portfolioSet.has(row.empresa);

        return (
          <li key={`${row.empresa}-${row.fonte}`}>
            <button
              type="button"
              onClick={() => onRowClick?.(row)}
              className={cn(
                "w-full text-left rounded-lg border border-line bg-surface-soft p-3.5",
                "active:bg-[#eef4ff] transition-colors"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[17px] text-ink truncate">
                      {row.empresa}
                    </span>
                    {isPortfolio && (
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 shrink-0" />
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-ink/45 truncate">
                    {sectorPt(row.sector)} · {fonteLabel}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono tabular text-sm text-ink">
                    {price != null ? formatValue(price, "money", priceCcy) : "–"}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between gap-3">
                <RatingCell rating={row.rating?.value} date={row.rating?.date} />
                <TargetCell
                  target={
                    live != null && row.target
                      ? { ...row.target, upside: null }
                      : row.target
                  }
                  priceValue={price}
                  priceCcy={priceCcy}
                />
              </div>

              {selectedMetrics.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-line/70 pt-2.5">
                  {selectedMetrics.map((mid) => {
                    const def = getMetricDef(mid);
                    const metricYears = yearsByMetric[mid] ?? [];
                    const ccy =
                      def.format === "money" || def.format === "millions"
                        ? defaultCcyForTicker(row.empresa)
                        : null;
                    return (
                      <div key={mid}>
                        <div className="text-[9px] uppercase tracking-[0.14em] text-ink/40 font-medium">
                          {def.label}
                        </div>
                        {metricYears.length === 0 ? (
                          <p className="mt-1 text-[11px] text-ink/35">sem dados</p>
                        ) : (
                          <div
                            className="mt-1 grid gap-1"
                            style={{
                              gridTemplateColumns: `repeat(${metricYears.length}, minmax(0, 1fr))`,
                            }}
                          >
                            {metricYears.map((year) => {
                              const cell = row.byMetricYear?.[mid]?.[year];
                              return (
                                <div
                                  key={year}
                                  className="rounded-md border border-line/70 bg-white px-1.5 py-1.5 text-center"
                                >
                                  <div className="text-[9px] uppercase tracking-wide text-ink/40">
                                    {shortYear(year)}
                                  </div>
                                  <div className="font-mono tabular text-[12px] text-ink mt-0.5">
                                    {cell?.value != null
                                      ? formatValue(cell.value, def.format, ccy)
                                      : "–"}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
