"use client";

import { formatNumber } from "@/lib/format";
import type { MarketRow } from "@/lib/mercado";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function pct(v: number | null): string {
  if (v == null) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${formatNumber(v, 2)}%`;
}

function pctClass(v: number | null): string {
  if (v == null) return "text-ink/40";
  if (v > 0) return "text-emerald-700";
  if (v < 0) return "text-red-700";
  return "text-ink/70";
}

function level(row: MarketRow): string {
  if (row.last == null) return "—";
  const digits =
    row.quoteType === "yield_pct" || row.quoteType === "acc_return_pct"
      ? 2
      : row.quoteType === "fx"
        ? 4
        : row.last >= 1000
          ? 0
          : 2;
  const n = formatNumber(row.last, digits);
  if (row.quoteType === "yield_pct" || row.quoteType === "acc_return_pct") {
    return `${n}%`;
  }
  return n;
}

type Props = {
  rows: MarketRow[];
  emptyHint?: string;
};

/** Tabela de nível e retornos 1D / 1S / 1M. */
export function MercadoReturnTable({ rows, emptyHint }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-ink/45 border border-line bg-white px-4 py-6 text-center">
        {emptyHint ?? "Sem dados"}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto border border-line bg-white">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-navy cursor-default">
            <TableHead className="text-[9px] uppercase tracking-[0.14em] text-left">
              Ativo
            </TableHead>
            <TableHead className="text-[9px] uppercase tracking-[0.14em] text-right">
              Último
            </TableHead>
            <TableHead className="text-[9px] uppercase tracking-[0.14em] text-right">
              1D
            </TableHead>
            <TableHead className="text-[9px] uppercase tracking-[0.14em] text-right">
              1S
            </TableHead>
            <TableHead className="text-[9px] uppercase tracking-[0.14em] text-right">
              1M
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.ric} className="cursor-default hover:bg-line/40">
              <TableCell className="text-sm">
                <div className="font-medium text-ink">{row.name}</div>
                {row.tracks ? (
                  <div className="text-[10px] text-ink/40">{row.tracks}</div>
                ) : (
                  !row.enabled && (
                    <div className="text-[10px] text-ink/40">
                      {row.notes ?? "Sem série"}
                    </div>
                  )
                )}
              </TableCell>
              <TableCell className="text-right font-mono text-sm tabular">
                {level(row)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-mono text-sm tabular",
                  pctClass(row.ret1d)
                )}
              >
                {pct(row.ret1d)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-mono text-sm tabular",
                  pctClass(row.ret1w)
                )}
              >
                {pct(row.ret1w)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-mono text-sm tabular",
                  pctClass(row.ret1m)
                )}
              >
                {pct(row.ret1m)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
