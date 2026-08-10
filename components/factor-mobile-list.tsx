"use client";

import { Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/format";
import { sectorPt } from "@/lib/sector-labels";
import {
  type FactorClass,
  type FactorRow,
} from "@/lib/factor-scoring";
import { cn } from "@/lib/utils";

type Props = {
  data: FactorRow[];
  isLoading: boolean;
  onRowClick?: (row: FactorRow) => void;
};

function fmtZ(v: number | null): string {
  if (v == null) return "–";
  const sign = v > 0 ? "+" : "";
  return `${sign}${formatNumber(v, 2)}`;
}

const CLASS_STYLES: Record<FactorClass, string> = {
  A: "bg-brand/10 text-brand border-brand/30",
  B: "bg-surface text-ink/70 border-line",
  C: "bg-destructive/10 text-destructive border-destructive/25",
};

/**
 * Lista compacta para mobile — ticker, score, classe e fatores.
 * Toque abre o mesmo drawer da tabela desktop.
 */
export function FactorMobileList({ data, isLoading, onRowClick }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2 md:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[108px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="md:hidden rounded-lg border border-line bg-surface-soft py-16 text-center px-4">
        <p className="font-display text-lg text-ink/70">Nenhuma empresa no filtro</p>
        <p className="mt-1 text-sm text-ink/50">Ajuste setor, classe ou elegibilidade.</p>
      </div>
    );
  }

  return (
    <ul className="md:hidden space-y-2">
      {data.map((row) => {
        const c = row.factorClass;
        return (
          <li key={row.ric}>
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
                      {row.ticker}
                    </span>
                    {row.inPortfolio && (
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 shrink-0" />
                    )}
                    {c && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-semibold tabular text-[10px] h-5 px-1.5",
                          CLASS_STYLES[c]
                        )}
                      >
                        {c}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-ink/45 truncate">
                    {row.sector ? sectorPt(row.sector) : "Sem setor"}
                    {!row.eligible && row.ineligibleReason
                      ? ` · ${row.ineligibleReason}`
                      : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[9px] uppercase tracking-[0.12em] text-ink/40">
                    Score
                  </div>
                  <div className="font-mono tabular text-base font-semibold text-ink mt-0.5">
                    {fmtZ(row.score)}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
                {(
                  [
                    ["Q", row.quality],
                    ["V", row.value],
                    ["M", row.momentum],
                    ["C", row.carry],
                  ] as const
                ).map(([label, v]) => (
                  <div
                    key={label}
                    className="rounded-md border border-line/70 bg-white px-1 py-1.5"
                  >
                    <div className="text-[9px] uppercase tracking-wide text-ink/40">
                      {label}
                    </div>
                    <div className="tabular text-[12px] font-medium text-ink mt-0.5">
                      {fmtZ(v)}
                    </div>
                  </div>
                ))}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
