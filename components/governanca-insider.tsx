"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateShort, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  formatMonthLabel,
  groupByCargo,
  normMove,
  positionShare,
  totalsByCompany,
  type CompanyTotals,
  type InsiderPayload,
  type InsiderTrade,
} from "@/lib/insider-trades";

function qty(v: number | null): string {
  if (v == null) return "–";
  return formatNumber(v, 0);
}

function price(v: number | null): string {
  if (v == null) return "–";
  return formatNumber(v, 2);
}

function reais(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `R$ ${formatNumber(v / 1e9, 1)} bi`;
  if (abs >= 1e6) return `R$ ${formatNumber(v / 1e6, 1)} mi`;
  return `R$ ${formatNumber(v, 0)}`;
}

function isBuy(mov: string): boolean {
  return normMove(mov).startsWith("compra");
}

function Rows({ rows, showTicker = false }: { rows: InsiderTrade[]; showTicker?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[40rem]">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-ink/40">
            {showTicker && <th className="px-4 py-2 font-medium">Empresa</th>}
            <th className="px-3 py-2 font-medium">Data</th>
            <th className="px-3 py-2 font-medium">Movimentação</th>
            <th className="px-3 py-2 font-medium">Valor mobiliário</th>
            <th className="px-3 py-2 font-medium text-right">Qtd</th>
            <th className="px-3 py-2 font-medium text-right">Preço</th>
            <th className="px-4 py-2 font-medium text-right">Volume</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const buy = isBuy(row.movimentacao);
            return (
              <tr key={row.id} className="text-[13px] border-t border-line">
                {showTicker && (
                  <td className="px-4 py-2 font-medium whitespace-nowrap">{row.ticker}</td>
                )}
                <td className="px-3 py-2 tabular whitespace-nowrap text-ink/70">
                  {formatDateShort(row.date)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span
                    className={cn(
                      "inline-block px-1.5 py-0.5 text-[11px]",
                      buy
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-rose-50 text-rose-800"
                    )}
                  >
                    {row.movimentacao}
                  </span>
                </td>
                <td className="px-3 py-2 text-ink/70">{row.valorMobiliario ?? "–"}</td>
                <td className="px-3 py-2 tabular text-right">{qty(row.quantidade)}</td>
                <td className="px-3 py-2 tabular text-right">{price(row.preco)}</td>
                <td className="px-4 py-2 tabular text-right">
                  {row.volume == null ? "–" : reais(row.volume)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function sideCell(count: number, volume: number, tone: "buy" | "sell"): React.ReactNode {
  if (count === 0) return <span className="text-ink/30">–</span>;
  return (
    <span className={tone === "buy" ? "text-emerald-800" : "text-rose-800"}>{reais(volume)}</span>
  );
}

/** Quantidade e preço médio (volume dividido pela quantidade). */
function ShareCell({ traded, opening }: { traded: number; opening: number }) {
  const pct = positionShare(traded, opening);
  return (
    <td className="px-4 py-2 tabular text-right">
      {pct == null ? <span className="text-ink/30">–</span> : `${formatNumber(pct, 2)}%`}
    </td>
  );
}

function QtyPrice({ qty, volume }: { qty: number; volume: number }) {
  const empty = qty <= 0;
  return (
    <>
      <td className="px-4 py-2 tabular text-right">{empty ? "–" : formatNumber(qty, 0)}</td>
      <td className="px-4 py-2 tabular text-right">
        {empty ? "–" : formatNumber(volume / qty, 2)}
      </td>
    </>
  );
}

function CargoRows({
  ticker,
  rows,
  openingByCargo,
  onOpen,
}: {
  ticker: string;
  rows: InsiderTrade[];
  openingByCargo: Map<string, number>;
  onOpen: (cargo: string, rows: InsiderTrade[]) => void;
}) {
  const groups = groupByCargo(rows);
  return (
    <>
      {groups.map((group) => {
        const net = group.buyVolume - group.sellVolume;
        return (
          <tr
            key={group.cargo}
            className="text-[13px] border-t border-white cursor-pointer bg-surface hover:bg-line"
            onClick={() => onOpen(group.cargo, group.rows)}
          >
            <td className="px-4 py-2 pl-10 text-ink/80">{group.cargo}</td>
            <td className="px-4 py-2 tabular text-right">
              {sideCell(group.buys, group.buyVolume, "buy")}
            </td>
            <QtyPrice qty={group.buyQty} volume={group.buyVolume} />
            <td className="px-4 py-2 tabular text-right">
              {sideCell(group.sells, group.sellVolume, "sell")}
            </td>
            <QtyPrice qty={group.sellQty} volume={group.sellVolume} />
            <td
              className={cn(
                "px-4 py-2 tabular text-right",
                net > 0 && "text-emerald-800",
                net < 0 && "text-rose-800",
                net === 0 && "text-ink/30"
              )}
            >
              {net === 0 ? "–" : reais(net)}
            </td>
            <ShareCell
              traded={group.buyQty + group.sellQty}
              opening={openingByCargo.get(`${ticker}|${group.cargo}`) ?? 0}
            />
          </tr>
        );
      })}
    </>
  );
}

function CompanyTotalsTable({
  rows,
  tradesByTicker,
  open,
  onToggle,
  openingByTicker,
  openingByCargo,
}: {
  rows: CompanyTotals[];
  tradesByTicker: Map<string, InsiderTrade[]>;
  open: string | null;
  onToggle: (ticker: string) => void;
  openingByTicker: Map<string, number>;
  openingByCargo: Map<string, number>;
}) {
  const [detail, setDetail] = React.useState<{
    ticker: string;
    cargo: string;
    rows: InsiderTrade[];
  } | null>(null);
  const detailRows = detail
    ? [...detail.rows].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
    : [];

  React.useEffect(() => {
    setDetail(null);
  }, [open]);

  return (
    <div className="overflow-x-auto border border-navy/20 bg-white">
      <table className="w-full text-left min-w-[28rem]">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-white/80 bg-navy">
            <th className="px-4 py-2 font-medium">Empresa</th>
            <th className="px-4 py-2 font-medium text-right">Compras</th>
            <th className="px-4 py-2 font-medium text-right">Qtd</th>
            <th className="px-4 py-2 font-medium text-right">Preço médio</th>
            <th className="px-4 py-2 font-medium text-right">Vendas</th>
            <th className="px-4 py-2 font-medium text-right">Qtd</th>
            <th className="px-4 py-2 font-medium text-right">Preço médio</th>
            <th className="px-4 py-2 font-medium text-right">Volume líquido</th>
            <th className="px-4 py-2 font-medium text-right">% posição</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const expanded = open === row.ticker;
            return (
              <React.Fragment key={row.ticker}>
                <tr
                  className="text-[13px] border-t border-line cursor-pointer bg-white hover:bg-surface-soft"
                  onClick={() => onToggle(row.ticker)}
                >
                  <td className="px-4 py-2 font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 text-ink/40 transition-transform",
                          expanded && "rotate-90"
                        )}
                        aria-hidden
                      />
                      {row.ticker}
                    </span>
                  </td>
                  <td className="px-4 py-2 tabular text-right">{sideCell(row.buys, row.buyVolume, "buy")}</td>
                  <QtyPrice qty={row.buyQty} volume={row.buyVolume} />
                  <td className="px-4 py-2 tabular text-right">{sideCell(row.sells, row.sellVolume, "sell")}</td>
                  <QtyPrice qty={row.sellQty} volume={row.sellVolume} />
                  <td
                    className={cn(
                      "px-4 py-2 tabular text-right",
                      row.netVolume > 0 && "text-emerald-800",
                      row.netVolume < 0 && "text-rose-800",
                      row.netVolume === 0 && "text-ink/30"
                    )}
                  >
                    {row.netVolume === 0 ? "–" : reais(row.netVolume)}
                  </td>
                  <ShareCell
                    traded={row.buyQty + row.sellQty}
                    opening={openingByTicker.get(row.ticker) ?? 0}
                  />
                </tr>
                {expanded && (
                  <CargoRows
                    ticker={row.ticker}
                    rows={tradesByTicker.get(row.ticker) ?? []}
                    openingByCargo={openingByCargo}
                    onOpen={(cargo, cargoRows) =>
                      setDetail({ ticker: row.ticker, cargo, rows: cargoRows })
                    }
                  />
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      <Dialog open={detail != null} onOpenChange={(next) => !next && setDetail(null)}>
        <DialogContent>
          <div className="px-5 py-4 border-b border-line pr-12">
            <DialogTitle className="text-base font-medium text-ink">{detail?.ticker}</DialogTitle>
            <p className="text-sm text-ink/55 mt-0.5">{detail?.cargo}</p>
          </div>
          <div className="overflow-auto">
            <Rows rows={detailRows} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Compras e vendas de insiders das empresas em carteira. */
export function GovernancaInsider() {
  const [month, setMonth] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [open, setOpen] = React.useState<string | null>(null);
  const [payload, setPayload] = React.useState<InsiderPayload | undefined>();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setError(null);
    const params = month ? `?month=${encodeURIComponent(month)}` : "";
    (async () => {
      try {
        const res = await fetch(`/api/governanca/insider${params}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) setPayload(json as InsiderPayload);
      } catch (e) {
        if (!cancelled) {
          setPayload(undefined);
          setError(e instanceof Error ? e.message : "Erro ao carregar");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month]);

  const selected = month || payload?.month || "";
  const tickers = payload
    ? [...new Set(payload.rows.map((row) => row.ticker))].sort((a, b) =>
        a.localeCompare(b, "pt")
      )
    : [];
  const visible = payload
    ? payload.rows.filter((row) => !company || row.ticker === company)
    : [];
  const companyTotals = totalsByCompany(visible);
  const openingByTicker = new Map<string, number>();
  const openingByCargo = new Map<string, number>();
  for (const row of payload?.opening ?? []) {
    if (company && row.ticker !== company) continue;
    openingByTicker.set(row.ticker, (openingByTicker.get(row.ticker) ?? 0) + row.quantidade);
    const key = `${row.ticker}|${row.cargo}`;
    openingByCargo.set(key, (openingByCargo.get(key) ?? 0) + row.quantidade);
  }
  const tradesByTicker = React.useMemo(() => {
    const map = new Map<string, InsiderTrade[]>();
    const rows = (payload?.rows ?? []).filter((row) => !company || row.ticker === company);
    for (const row of rows) {
      const list = map.get(row.ticker) ?? [];
      list.push(row);
      map.set(row.ticker, list);
    }
    return map;
  }, [payload, company]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink tracking-tight">Insider trade</h2>
          <p className="text-xs text-ink/45 mt-0.5">
            Carteira · uma linha por empresa. Clique no cargo para ver as operações.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="text-[10px] uppercase tracking-[0.12em] text-ink/45">
            Empresa
            <select
              className="mt-1 block border border-line bg-white px-2 py-1.5 text-sm text-ink normal-case tracking-normal min-w-[8rem]"
              value={tickers.includes(company) ? company : ""}
              onChange={(e) => setCompany(e.target.value)}
              disabled={!tickers.length}
            >
              <option value="">Todas</option>
              {tickers.map((ticker) => (
                <option key={ticker} value={ticker}>
                  {ticker}
                </option>
              ))}
            </select>
          </label>
          <label className="text-[10px] uppercase tracking-[0.12em] text-ink/45">
            Mês
            <select
              className="mt-1 block border border-line bg-white px-2 py-1.5 text-sm text-ink normal-case tracking-normal"
              value={selected}
              onChange={(e) => {
                setMonth(e.target.value);
                setCompany("");
                setOpen(null);
              }}
              disabled={!payload?.months.length}
            >
              {(payload?.months ?? []).map((item) => (
                <option key={item} value={item}>
                  {formatMonthLabel(item)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3">
          {error}
        </p>
      )}
      {!payload && !error && <Skeleton className="h-40 w-full" />}
      {companyTotals.length > 0 && (
        <CompanyTotalsTable
          rows={companyTotals}
          tradesByTicker={tradesByTicker}
          open={open}
          onToggle={(ticker) => setOpen((current) => (current === ticker ? null : ticker))}
          openingByTicker={openingByTicker}
          openingByCargo={openingByCargo}
        />
      )}
      {payload && companyTotals.length === 0 && (
        <p className="text-sm text-ink/50 py-6 text-center border border-line bg-white">
          Nenhuma compra ou venda neste mês.
        </p>
      )}
    </section>
  );
}
