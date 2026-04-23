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
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatMillions,
  formatMoney,
  formatMultiple,
  formatPct,
  isNil,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ResearchRow } from "@/types/research";

// Mapa de cores por corretora (borda + texto) usando a paleta permitida
// e tons auxiliares de baixa intensidade para Bradesco e Safra.
const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  "BTG Pactual": { bg: "bg-brand/10", text: "text-brand" },
  "Bradesco BBI": { bg: "bg-[#C0392B]/10", text: "text-[#C0392B]" },
  "Safra": { bg: "bg-[#E3A63A]/15", text: "text-[#8A5C00]" },
};

// Ratings reais na base: Outperform / Neutral / Underperform / Not Rated / Under Review / n.a.
function ratingClass(r: string | null): string {
  if (!r) return "bg-surface text-ink/60";
  const lower = r.toLowerCase();
  if (lower.includes("outperform") || lower.includes("buy"))
    return "bg-green-500/15 text-green-800";
  if (lower.includes("underperform") || lower.includes("sell"))
    return "bg-red-500/15 text-red-800";
  return "bg-surface text-ink/70";
}

// Helper de celula numerica "—" quando nulo.
function Num({
  children,
  nil: isNilVal,
}: {
  children?: React.ReactNode;
  nil?: boolean;
}) {
  if (isNilVal) return <span className="text-line">—</span>;
  return <span className="tabular-nums">{children}</span>;
}

interface Props {
  data: ResearchRow[];
  isLoading: boolean;
  onRowClick?: (row: ResearchRow) => void;
}

export function ResearchTable({ data, isLoading, onRowClick }: Props) {
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
          <span className="font-medium text-ink">{row.original.empresa}</span>
        ),
      },
      {
        id: "ticker",
        header: "Ticker",
        accessorFn: (r) => r.empresa,
        cell: ({ row }) => (
          <Badge className="font-mono">{row.original.empresa}</Badge>
        ),
      },
      {
        accessorKey: "fonte",
        header: "Fonte",
        cell: ({ row }) => {
          const c = SOURCE_COLORS[row.original.fonte] ?? {
            bg: "bg-surface",
            text: "text-ink/70",
          };
          return (
            <Badge
              variant="outline"
              className={cn("border-line", c.bg, c.text, "font-medium")}
            >
              {row.original.fonte}
            </Badge>
          );
        },
      },
      {
        accessorKey: "rating",
        header: "Rating",
        cell: ({ row }) => {
          const r = row.original.rating;
          if (!r) return <Num nil />;
          return (
            <Badge variant="outline" className={cn("border-0", ratingClass(r))}>
              {r}
            </Badge>
          );
        },
      },
      {
        id: "target",
        header: "Target",
        accessorFn: (r) => r.target_price,
        cell: ({ row }) => {
          const { target_price, target_ccy } = row.original;
          return (
            <Num nil={isNil(target_price)}>
              {formatMoney(target_price, target_ccy ?? "R$")}
            </Num>
          );
        },
      },
      {
        accessorKey: "pe",
        header: "P/E",
        cell: ({ row }) => (
          <Num nil={isNil(row.original.pe)}>{formatMultiple(row.original.pe)}</Num>
        ),
      },
      {
        accessorKey: "net_income",
        header: "Net Income",
        cell: ({ row }) => (
          <Num nil={isNil(row.original.net_income)}>
            {formatMillions(row.original.net_income, "R$mn")}
          </Num>
        ),
      },
      {
        accessorKey: "revenue",
        header: "Revenue",
        cell: ({ row }) => (
          <Num nil={isNil(row.original.revenue)}>
            {formatMillions(row.original.revenue, "R$mn")}
          </Num>
        ),
      },
      {
        accessorKey: "ev_ebitda",
        header: "EV/EBITDA",
        cell: ({ row }) => (
          <Num nil={isNil(row.original.ev_ebitda)}>
            {formatMultiple(row.original.ev_ebitda)}
          </Num>
        ),
      },
      {
        accessorKey: "dy",
        header: "Div. Yield",
        cell: ({ row }) => (
          <Num nil={isNil(row.original.dy)}>{formatPct(row.original.dy)}</Num>
        ),
      },
      {
        accessorKey: "ebitda",
        header: "EBITDA",
        cell: ({ row }) => (
          <Num nil={isNil(row.original.ebitda)}>
            {formatMillions(row.original.ebitda, "R$mn")}
          </Num>
        ),
      },
      {
        accessorKey: "net_debt",
        header: "Net Debt",
        cell: ({ row }) => (
          <Num nil={isNil(row.original.net_debt)}>
            {formatMillions(row.original.net_debt, "R$mn")}
          </Num>
        ),
      },
      {
        accessorKey: "roic",
        header: "RoIC",
        cell: ({ row }) => (
          <Num nil={isNil(row.original.roic)}>{formatPct(row.original.roic)}</Num>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="rounded-lg border border-line bg-surface-soft overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => {
                const sort = h.column.getIsSorted();
                return (
                  <TableHead
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    className="select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {sort === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : sort === "desc" ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
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
              <tr key={i} className="border-b border-line">
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
                className="py-12 text-center text-ink/60"
              >
                Nenhuma empresa corresponde aos filtros.
              </TableCell>
            </tr>
          ) : (
            table.getRowModel().rows.map((row, idx) => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className={cn(idx % 2 === 0 ? "bg-surface-soft" : "bg-surface")}
              >
                {row.getVisibleCells().map((c) => (
                  <TableCell key={c.id}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
