"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatNumber } from "@/lib/format";
import type { SummaryStats } from "@/lib/queries";
import { Building2, FileText, Database, Clock } from "lucide-react";

interface Props {
  stats: SummaryStats | null;
  isLoading: boolean;
}

export function SummaryCards({ stats, isLoading }: Props) {
  const items = [
    {
      title: "Empresas cobertas",
      value: stats ? formatNumber(stats.empresasCount) : "",
      Icon: Building2,
    },
    {
      title: "Relatorios (30d)",
      value: stats ? formatNumber(stats.relatorios30d) : "",
      Icon: FileText,
    },
    {
      title: "Metricas armazenadas",
      value: stats ? formatNumber(stats.metricasTotal) : "",
      Icon: Database,
    },
    {
      title: "Ultima atualizacao",
      value: stats ? formatDate(stats.ultimaAtualizacao) : "",
      Icon: Clock,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(({ title, value, Icon }) => (
        <Card key={title}>
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle>{title}</CardTitle>
            <Icon className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            {isLoading || !stats ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="text-2xl font-semibold text-ink tabular-nums">
                {value}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
