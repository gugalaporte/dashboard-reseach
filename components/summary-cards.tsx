"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { formatDateLong, formatNumber } from "@/lib/format";
import type { SummaryStats } from "@/lib/queries";
import { Building2, FileText, Database, Clock, type LucideIcon } from "lucide-react";

interface Props {
  stats: SummaryStats | null;
  isLoading: boolean;
}

type CardItem = {
  label: string;
  value: string;
  Icon: LucideIcon;
  // Se true, usa fonte display (serif) para o valor - bom para numeros grandes e datas.
  displayFont: boolean;
};

export function SummaryCards({ stats, isLoading }: Props) {
  const items: CardItem[] = [
    {
      label: "EMPRESAS COBERTAS",
      value: stats ? formatNumber(stats.empresasCount) : "",
      Icon: Building2,
      displayFont: true,
    },
    {
      label: "RELATÓRIOS (30D)",
      value: stats ? formatNumber(stats.relatorios30d) : "",
      Icon: FileText,
      displayFont: true,
    },
    {
      label: "MÉTRICAS ARMAZENADAS",
      value: stats ? formatNumber(stats.metricasTotal) : "",
      Icon: Database,
      displayFont: true,
    },
    {
      label: "ÚLTIMA ATUALIZAÇÃO",
      value: stats ? formatDateLong(stats.ultimaAtualizacao) : "",
      Icon: Clock,
      displayFont: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(({ label, value, Icon, displayFont }) => (
        <div
          key={label}
          className="group rounded-lg border border-line bg-surface-soft p-6 hover:border-brand-soft/60 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink/60 font-medium">
              {label}
            </div>
            <Icon className="w-4 h-4 text-ink/25 group-hover:text-brand-soft transition-colors" />
          </div>
          <div className="mt-4 leading-none">
            {isLoading || !stats ? (
              <Skeleton className="h-9 w-24" />
            ) : displayFont ? (
              <span className="font-display text-4xl text-ink tabular">
                {value}
              </span>
            ) : (
              <span className="font-mono text-3xl text-ink tabular">
                {value}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
