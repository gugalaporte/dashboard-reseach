"use client";

import { Star } from "lucide-react";
import { RatingCell } from "@/components/rating-cell";
import { TargetCell } from "@/components/target-cell";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { defaultCcyForTicker, FONTE_SHORT_LABEL, type ResearchRow } from "@/lib/queries";
import type { LivePricesMap } from "@/lib/use-live-prices";
import { formatValue } from "@/lib/format";
import { sectorPt } from "@/lib/sector-labels";

type Props = {
  data: ResearchRow[];
  isLoading: boolean;
  onRowClick?: (row: ResearchRow) => void;
  livePrices?: LivePricesMap;
  portfolioTickers?: string[];
};

/**
 * Lista compacta para mobile — ticker, rating, preço/target e fonte.
 * Toque abre o mesmo drawer da tabela desktop.
 */
export function ResearchMobileList({
  data,
  isLoading,
  onRowClick,
  livePrices,
  portfolioTickers = [],
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
            </button>
          </li>
        );
      })}
    </ul>
  );
}
