"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import type { RatingBucket } from "@/lib/rating";
import {
  Building2,
  Database,
  TrendingUp,
  Minus,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";

export type SummaryData = {
  empresasCount: number;
  metricasTotal: number;
  bullishCount: number; // Buy + Outperform + Overweight + Strong Buy
  neutralCount: number; // Neutral + Hold + Market Perform
  bearishCount: number; // Sell + Underperform + Underweight
};

// Apenas os buckets clicaveis (so ratings filtram a tabela).
export type RatingFilterBucket = Extract<
  RatingBucket,
  "bullish" | "neutral" | "bearish"
>;

interface Props {
  data: SummaryData | null;
  isLoading: boolean;
  // Bucket ativo (visual + filtro). null = nenhum filtro.
  activeBucket?: RatingFilterBucket | null;
  // Chamado ao clicar num card de rating. Passa null para limpar.
  onBucketChange?: (bucket: RatingFilterBucket | null) => void;
}

type CardItem = {
  label: string;
  value: string;
  Icon: LucideIcon;
  // Cor opcional do icone. Se omitida, herda o tom neutro padrao.
  iconClass?: string;
  // Se preenchido, o card vira clicavel e filtra por esse bucket.
  bucket?: RatingFilterBucket;
};

export function SummaryCards({
  data,
  isLoading,
  activeBucket,
  onBucketChange,
}: Props) {
  const items: CardItem[] = [
    {
      label: "EMPRESAS COBERTAS",
      value: data ? formatNumber(data.empresasCount) : "",
      Icon: Building2,
    },
    {
      label: "MÉTRICAS ARMAZENADAS",
      value: data ? formatNumber(data.metricasTotal) : "",
      Icon: Database,
    },
    {
      label: "BUY / OUTPERFORM",
      value: data ? formatNumber(data.bullishCount) : "",
      Icon: TrendingUp,
      iconClass: "text-emerald-600",
      bucket: "bullish",
    },
    {
      label: "NEUTRAL",
      value: data ? formatNumber(data.neutralCount) : "",
      Icon: Minus,
      bucket: "neutral",
    },
    {
      label: "SELL / UNDERPERFORM",
      value: data ? formatNumber(data.bearishCount) : "",
      Icon: TrendingDown,
      iconClass: "text-red-600",
      bucket: "bearish",
    },
  ];

  // Classe de borda quando o card esta selecionado. Usa a cor do icone.
  function activeRingClass(bucket: RatingFilterBucket): string {
    if (bucket === "bullish") return "border-emerald-600 ring-1 ring-emerald-600/30";
    if (bucket === "bearish") return "border-red-600 ring-1 ring-red-600/30";
    return "border-ink/50 ring-1 ring-ink/15";
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map(({ label, value, Icon, iconClass, bucket }) => {
        const clickable = Boolean(bucket && onBucketChange);
        const isActive = bucket && activeBucket === bucket;
        // Ao clicar num card ja ativo, limpa o filtro (toggle).
        const handleClick = () => {
          if (!clickable || !bucket) return;
          onBucketChange!(isActive ? null : bucket);
        };

        return (
          <button
            type="button"
            key={label}
            onClick={handleClick}
            disabled={!clickable}
            aria-pressed={isActive || undefined}
            className={cn(
              "group text-left rounded-md border bg-surface-soft px-4 py-3 transition-colors",
              "disabled:cursor-default",
              clickable && !isActive && "hover:border-brand-soft/60 cursor-pointer",
              !isActive && "border-line",
              isActive && activeRingClass(bucket!)
            )}
          >
            <div className="flex items-center justify-between">
              <div className="text-[9px] uppercase tracking-[0.16em] text-ink/55 font-medium">
                {label}
              </div>
              <Icon
                className={cn(
                  "w-3.5 h-3.5 transition-colors",
                  iconClass ?? "text-ink/25 group-hover:text-brand-soft"
                )}
              />
            </div>
            <div className="mt-1.5 leading-none">
              {isLoading || !data ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <span className="font-display text-2xl text-ink tabular">
                  {value}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
