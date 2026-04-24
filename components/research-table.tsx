"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCell } from "@/components/metric-cell";
import { RatingCell } from "@/components/rating-cell";
import { TargetCell } from "@/components/target-cell";
import { cn } from "@/lib/utils";
import type { ResearchRow } from "@/lib/queries";
import type { LivePricesMap } from "@/lib/use-live-prices";
import { getMetricDef, type MetricId } from "@/lib/metrics";

// Cores outline por corretora (borda + texto, sem fundo preenchido).
const SOURCE_STYLE: Record<
  string,
  { border: string; text: string; label: string }
> = {
  "BTG Pactual": { border: "border-[#1B61B6]", text: "text-[#1B61B6]", label: "BTG" },
  "Bradesco BBI": { border: "border-[#C0392B]", text: "text-[#C0392B]", label: "BBI" },
  Safra: { border: "border-[#B8860B]", text: "text-[#B8860B]", label: "SAFRA" },
};

// Largura fixa da coluna sticky (empresa). Em px, sem derivar de fonte.
const W_EMPRESA = 110;

// IDs das colunas "base" (nao-metricas). Usado para saber onde comeca cada grupo de metrica.
const BASE_COLUMN_IDS = ["empresa", "fonte", "rating", "price", "target"] as const;

interface Props {
  data: ResearchRow[];
  isLoading: boolean;
  onRowClick?: (row: ResearchRow) => void;
  livePrices?: LivePricesMap;
  // Metricas selecionadas pelo usuario (1 a 3).
  selectedMetrics: MetricId[];
  // Anos a exibir como sub-colunas (normalmente 3).
  years: string[];
}

export function ResearchTable({
  data,
  isLoading,
  onRowClick,
  livePrices,
  selectedMetrics,
  years,
}: Props) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "empresa", desc: false },
  ]);

  // Constroi colunas leaf. Grupos de metrica ficam como 3 colunas sequenciais
  // id=`${metricId}_${year}`. O agrupamento visual vem do header manual abaixo.
  const columns = React.useMemo<ColumnDef<ResearchRow>[]>(() => {
    const base: ColumnDef<ResearchRow>[] = [
      {
        accessorKey: "empresa",
        header: "Empresa",
        cell: ({ row }) => (
          <span className="font-display text-[15px] text-ink">
            {row.original.empresa}
          </span>
        ),
      },
      {
        accessorKey: "fonte",
        header: "Fonte",
        cell: ({ row }) => {
          const s = SOURCE_STYLE[row.original.fonte];
          if (!s)
            return (
              <span className="text-[10px] uppercase text-ink/60">
                {row.original.fonte}
              </span>
            );
          return (
            <span
              className={cn(
                "inline-flex items-center h-6 px-2 rounded-sm border text-[10px] uppercase tracking-[0.12em] font-medium bg-transparent",
                s.border,
                s.text
              )}
            >
              {s.label}
            </span>
          );
        },
      },
      {
        id: "rating",
        header: "Rating",
        accessorFn: (r) => r.rating?.value ?? null,
        cell: ({ row }) => (
          <RatingCell
            rating={row.original.rating?.value}
            date={row.original.rating?.date}
          />
        ),
      },
      {
        id: "price",
        header: "Preço",
        accessorFn: (r) => {
          const live = livePrices?.get(r.empresa)?.price;
          return live ?? r.price?.value ?? null;
        },
        cell: ({ row }) => {
          const live = livePrices?.get(row.original.empresa);
          if (live) {
            const hhmm = new Date(live.asOf).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <MetricCell
                value={live.price}
                date={null}
                periodo={`ao vivo · ${hhmm}`}
                ccy={live.currency === "BRL" ? "R$" : live.currency}
                format="money"
              />
            );
          }
          return (
            <MetricCell
              value={row.original.price?.value}
              date={row.original.price?.date}
              format="money"
            />
          );
        },
      },
      {
        id: "target",
        header: "Target",
        accessorFn: (r) => r.target?.value ?? null,
        cell: ({ row }) => {
          const live = livePrices?.get(row.original.empresa)?.price;
          const effectivePrice = live ?? row.original.price?.value ?? null;
          const target =
            live != null && row.original.target
              ? { ...row.original.target, upside: null }
              : row.original.target;
          return <TargetCell target={target} priceValue={effectivePrice} />;
        },
      },
    ];

    // Colunas de metrica: 1 leaf por (metrica x ano). Acessor retorna o valor
    // cru; cell usa MetricCell (valor em cima + data do relatorio embaixo).
    // Nao passamos `periodo` pois o ano ja esta representado pelo header.
    const metricCols: ColumnDef<ResearchRow>[] = [];
    for (const mid of selectedMetrics) {
      const def = getMetricDef(mid);
      for (const year of years) {
        metricCols.push({
          id: `${mid}_${year}`,
          header: `${year}E`,
          accessorFn: (r) => r.byMetricYear?.[mid]?.[year]?.value ?? null,
          cell: ({ row }) => {
            const c = row.original.byMetricYear?.[mid]?.[year];
            return (
              <MetricCell
                value={c?.value}
                date={c?.date ?? null}
                format={def.format}
              />
            );
          },
        });
      }
    }

    return [...base, ...metricCols];
  }, [selectedMetrics, years, livePrices]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Classes posicionais por column id (sticky so para Empresa).
  function stickyClass(colId: string): string {
    if (colId === "empresa")
      return "sticky left-0 z-[1] bg-inherit sticky-shadow-right";
    return "";
  }
  function stickyStyle(colId: string): React.CSSProperties | undefined {
    if (colId === "empresa") return { minWidth: W_EMPRESA, width: W_EMPRESA };
    return undefined;
  }

  // Flat headers (1 por leaf column) na ordem visual.
  const leafHeaders = table.getHeaderGroups()[0]?.headers ?? [];

  return (
    <div className="rounded-lg border border-line bg-surface-soft overflow-hidden">
      <div className="max-h-[calc(100vh-280px)] overflow-auto scrollbar-thin">
        <Table>
          <TableHeader>
            {/* Linha 1: colunas base (rowSpan=2) + titulo de cada metrica (colSpan=years.length) */}
            <tr>
              {leafHeaders
                .filter((h) =>
                  (BASE_COLUMN_IDS as readonly string[]).includes(h.column.id)
                )
                .map((h) => {
                  const sort = h.column.getIsSorted();
                  const id = h.column.id;
                  const isSticky = id === "empresa";
                  return (
                    <TableHead
                      key={h.id}
                      rowSpan={selectedMetrics.length > 0 ? 2 : 1}
                      onClick={h.column.getToggleSortingHandler()}
                      style={stickyStyle(id)}
                      className={cn(
                        "group h-10 text-[10px] uppercase tracking-[0.14em] font-medium text-surface-soft/80",
                        "border-b border-ink/40 select-none cursor-pointer align-middle",
                        isSticky && "sticky left-0 z-40 bg-navy",
                        !isSticky && "bg-navy"
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {sort === "asc" ? (
                          <ArrowUp className="h-3 w-3 opacity-100" />
                        ) : sort === "desc" ? (
                          <ArrowDown className="h-3 w-3 opacity-100" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        )}
                      </span>
                    </TableHead>
                  );
                })}
              {/* Agrupadores: 1 por metrica selecionada, colSpan=years.length */}
              {selectedMetrics.map((mid) => {
                const def = getMetricDef(mid);
                return (
                  <TableHead
                    key={`group_${mid}`}
                    colSpan={years.length}
                    className={cn(
                      "h-10 text-[11px] uppercase tracking-[0.14em] font-medium",
                      "bg-navy text-surface-soft border-b border-ink/40",
                      "border-l border-ink/40 text-center"
                    )}
                  >
                    {def.label}
                  </TableHead>
                );
              })}
            </tr>
            {/* Linha 2: anos para cada metrica (so renderiza se houver metricas) */}
            {selectedMetrics.length > 0 && (
              <tr>
                {selectedMetrics.flatMap((mid) =>
                  years.map((year, yIdx) => {
                    const h = leafHeaders.find(
                      (x) => x.column.id === `${mid}_${year}`
                    );
                    if (!h) return null;
                    const sort = h.column.getIsSorted();
                    return (
                      <TableHead
                        key={h.id}
                        onClick={h.column.getToggleSortingHandler()}
                        className={cn(
                          "group h-9 text-[10px] uppercase tracking-[0.12em] font-medium text-surface-soft/70",
                          "bg-navy border-b border-ink/40 select-none cursor-pointer text-center",
                          yIdx === 0 && "border-l border-ink/40"
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {year}E
                          {sort === "asc" ? (
                            <ArrowUp className="h-3 w-3 opacity-100" />
                          ) : sort === "desc" ? (
                            <ArrowDown className="h-3 w-3 opacity-100" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                          )}
                        </span>
                      </TableHead>
                    );
                  })
                )}
              </tr>
            )}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr
                  key={i}
                  className={cn(
                    "h-16 border-b border-line/60",
                    i % 2 === 0 ? "bg-surface-soft" : "bg-surface/40"
                  )}
                >
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <TableCell
                  colSpan={columns.length}
                  className="py-24 text-center"
                >
                  <Search className="w-8 h-8 text-ink/20 mx-auto" />
                  <p className="mt-4 font-display text-lg text-ink/70">
                    Nenhuma empresa corresponde
                  </p>
                  <p className="mt-1 text-sm text-ink/50">
                    Ajuste os filtros ou busque por outro ticker.
                  </p>
                </TableCell>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => {
                return (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(idx, 20) * 0.015 }}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      "group/row h-16 border-b border-line/60 cursor-pointer transition-colors",
                      idx % 2 === 0 ? "bg-surface-soft" : "bg-surface/40",
                      "hover:bg-brand-soft/10"
                    )}
                  >
                    {row.getVisibleCells().map((c) => {
                      const id = c.column.id;
                      const isSticky = id === "empresa";
                      // Separador visual antes do primeiro ano de cada metrica.
                      const isFirstYearOfMetric = selectedMetrics.some(
                        (mid) => id === `${mid}_${years[0]}`
                      );
                      return (
                        <TableCell
                          key={c.id}
                          style={stickyStyle(id)}
                          className={cn(
                            "px-3 py-2 align-middle",
                            isSticky && stickyClass(id),
                            isFirstYearOfMetric && "border-l border-line/50",
                            // Alinhamento: metricas (numericas) a direita.
                            id.includes("_") && "text-right"
                          )}
                        >
                          {flexRender(c.column.columnDef.cell, c.getContext())}
                        </TableCell>
                      );
                    })}
                  </motion.tr>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
