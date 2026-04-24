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

// Cores outline por corretora (borda + texto, sem fundo preenchido).
const SOURCE_STYLE: Record<
  string,
  { border: string; text: string; label: string }
> = {
  "BTG Pactual": { border: "border-[#1B61B6]", text: "text-[#1B61B6]", label: "BTG" },
  "Bradesco BBI": { border: "border-[#C0392B]", text: "text-[#C0392B]", label: "BBI" },
  Safra: { border: "border-[#B8860B]", text: "text-[#B8860B]", label: "SAFRA" },
};

// Larguras fixas das colunas sticky (empresa + ticker). Em px, sem derivar de fonte.
const W_EMPRESA = 110;
const W_TICKER = 90;

// Colunas que iniciam um grupo semantico visual (border-l fino).
// Aplicado em: rating, pe, net_income, roic.
const GROUP_STARTS = new Set(["rating", "pe", "net_income", "roic"]);

// Conta quantas celulas de metrica tem valor (ignora identidade + rating/preco).
function countFilled(r: ResearchRow): number {
  const cells = [
    r.target,
    r.pe,
    r.ev_ebitda,
    r.dy,
    r.roic,
    r.revenue,
    r.ebitda,
    r.net_debt,
    r.net_income,
  ];
  return cells.filter((c) => c && c.value != null).length;
}

interface Props {
  data: ResearchRow[];
  isLoading: boolean;
  onRowClick?: (row: ResearchRow) => void;
  // Mapa ticker -> cotacao atual (Yahoo). Undefined se ainda nao carregou;
  // ticker ausente no mapa = sem cotacao live -> usar fallback do banco.
  livePrices?: LivePricesMap;
}

export function ResearchTable({
  data,
  isLoading,
  onRowClick,
  livePrices,
}: Props) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "empresa", desc: false },
  ]);

  // Memoizacao obrigatoria para evitar re-criar colunas a cada render.
  const columns = React.useMemo<ColumnDef<ResearchRow>[]>(
    () => [
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
        id: "ticker",
        header: "Ticker",
        accessorFn: (r) => r.empresa,
        cell: ({ row }) => (
          <span className="inline-flex items-center h-6 px-2 rounded-sm bg-navy/5 border border-navy/10 font-mono text-[11px] tracking-wide text-navy">
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
        // Ordenacao usa o valor efetivo (live quando existir).
        accessorFn: (r) => {
          const live = livePrices?.get(r.empresa)?.price;
          return live ?? r.price?.value ?? null;
        },
        cell: ({ row }) => {
          const live = livePrices?.get(row.original.empresa);
          // Live disponivel -> mostra preco do Yahoo + sub "ao vivo · HH:MM"
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
          // Fallback: preco historico do banco.
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
          // Upside vs preco atual: usa live quando existir, senao preco da casa.
          const live = livePrices?.get(row.original.empresa)?.price;
          const effectivePrice = live ?? row.original.price?.value ?? null;
          // Quando ha live, ignora o upside pre-calculado do banco (que usa
          // preco historico) e deixa o TargetCell recalcular com o preco atual.
          const target =
            live != null && row.original.target
              ? { ...row.original.target, upside: null }
              : row.original.target;
          return <TargetCell target={target} priceValue={effectivePrice} />;
        },
      },
      {
        id: "pe",
        header: "P/E",
        accessorFn: (r) => r.pe?.value ?? null,
        cell: ({ row }) => (
          <MetricCell
            value={row.original.pe?.value}
            date={row.original.pe?.date}
            periodo={row.original.pe?.periodo}
            format="mult"
          />
        ),
      },
      {
        id: "net_income",
        header: "Net Income",
        accessorFn: (r) => r.net_income?.value ?? null,
        cell: ({ row }) => (
          <MetricCell
            value={row.original.net_income?.value}
            date={row.original.net_income?.date}
            periodo={row.original.net_income?.periodo}
            format="millions"
          />
        ),
      },
      {
        id: "revenue",
        header: "Receita",
        accessorFn: (r) => r.revenue?.value ?? null,
        cell: ({ row }) => (
          <MetricCell
            value={row.original.revenue?.value}
            date={row.original.revenue?.date}
            periodo={row.original.revenue?.periodo}
            format="millions"
          />
        ),
      },
      {
        id: "ev_ebitda",
        header: "EV/EBITDA",
        accessorFn: (r) => r.ev_ebitda?.value ?? null,
        cell: ({ row }) => (
          <MetricCell
            value={row.original.ev_ebitda?.value}
            date={row.original.ev_ebitda?.date}
            periodo={row.original.ev_ebitda?.periodo}
            format="mult"
          />
        ),
      },
      {
        id: "dy",
        header: "Div. Yield",
        accessorFn: (r) => r.dy?.value ?? null,
        cell: ({ row }) => (
          <MetricCell
            value={row.original.dy?.value}
            date={row.original.dy?.date}
            periodo={row.original.dy?.periodo}
            format="pct"
          />
        ),
      },
      {
        id: "ebitda",
        header: "EBITDA",
        accessorFn: (r) => r.ebitda?.value ?? null,
        cell: ({ row }) => (
          <MetricCell
            value={row.original.ebitda?.value}
            date={row.original.ebitda?.date}
            periodo={row.original.ebitda?.periodo}
            format="millions"
          />
        ),
      },
      {
        id: "net_debt",
        header: "Dívida Líq.",
        accessorFn: (r) => r.net_debt?.value ?? null,
        cell: ({ row }) => (
          <MetricCell
            value={row.original.net_debt?.value}
            date={row.original.net_debt?.date}
            periodo={row.original.net_debt?.periodo}
            format="millions"
          />
        ),
      },
      {
        id: "roic",
        header: "RoIC",
        accessorFn: (r) => r.roic?.value ?? null,
        cell: ({ row }) => (
          <MetricCell
            value={row.original.roic?.value}
            date={row.original.roic?.date}
            periodo={row.original.roic?.periodo}
            format="pct"
          />
        ),
      },
    ],
    [livePrices]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Classes posicionais por column id (sticky para Empresa/Ticker).
  // z-[1] para ficar abaixo do thead (z-30) mas acima das celulas normais.
  function stickyClass(colId: string): string {
    if (colId === "empresa")
      return "sticky left-0 z-[1] bg-inherit sticky-shadow-right";
    if (colId === "ticker") return "sticky z-[1] bg-inherit";
    return "";
  }
  function stickyStyle(colId: string): React.CSSProperties | undefined {
    if (colId === "empresa") return { minWidth: W_EMPRESA, width: W_EMPRESA };
    if (colId === "ticker")
      return { left: W_EMPRESA, minWidth: W_TICKER, width: W_TICKER };
    return undefined;
  }

  return (
    <div className="rounded-lg border border-line bg-surface-soft overflow-hidden">
      <div className="max-h-[calc(100vh-280px)] overflow-auto scrollbar-thin">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => {
                  const sort = h.column.getIsSorted();
                  const id = h.column.id;
                  const isSticky = id === "empresa" || id === "ticker";
                  return (
                    <TableHead
                      key={h.id}
                      onClick={h.column.getToggleSortingHandler()}
                      style={stickyStyle(id)}
                      className={cn(
                        "group h-10 text-[10px] uppercase tracking-[0.14em] font-medium text-surface-soft/80",
                        "border-b border-ink/40 select-none cursor-pointer",
                        // Canto sticky (empresa/ticker no header): z-40 para ficar sobre thead (30) e cells (1).
                        isSticky && "sticky left-0 z-40 bg-navy",
                        GROUP_STARTS.has(id) && "border-l border-ink/40"
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
              </tr>
            ))}
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
                const coverage = countFilled(row.original);
                const sparse = coverage <= 3;
                return (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: Math.min(idx, 20) * 0.015 }}
                    onClick={() => onRowClick?.(row.original)}
                    className={cn(
                      "group/row h-16 border-b border-line/60 cursor-pointer transition-colors",
                      // zebra sutil
                      idx % 2 === 0 ? "bg-surface-soft" : "bg-surface/40",
                      // hover institucional
                      "hover:bg-brand-soft/10",
                      // cobertura rala fica mais discreta
                      sparse && "opacity-70 hover:opacity-100"
                    )}
                  >
                    {row.getVisibleCells().map((c) => {
                      const id = c.column.id;
                      const isSticky = id === "empresa" || id === "ticker";
                      return (
                        <TableCell
                          key={c.id}
                          style={stickyStyle(id)}
                          className={cn(
                            "px-3 py-2 align-middle",
                            isSticky && stickyClass(id),
                            GROUP_STARTS.has(id) && "border-l border-line/50"
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
