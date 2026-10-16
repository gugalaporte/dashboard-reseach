"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateShort, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  formatMonthLabel,
  groupByCargo,
  normMove,
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

function Rows({ rows }: { rows: InsiderTrade[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[40rem]">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-ink/40">
            <th className="px-4 py-2 font-medium">Empresa</th>
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
                <td className="px-4 py-2 font-medium whitespace-nowrap">{row.ticker}</td>
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
    <span className={tone === "buy" ? "text-emerald-800" : "text-rose-800"}>
      {reais(volume)}
      <span className="text-ink/40">
        {" "}
        · {count} {count === 1 ? "op." : "ops."}
      </span>
    </span>
  );
}

function CompanyTotalsTable({ rows }: { rows: CompanyTotals[] }) {
  return (
    <div className="overflow-x-auto border border-line bg-white">
      <table className="w-full text-left min-w-[28rem]">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-ink/40">
            <th className="px-4 py-2 font-medium">Empresa</th>
            <th className="px-4 py-2 font-medium text-right">Compras</th>
            <th className="px-4 py-2 font-medium text-right">Vendas</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.ticker} className="text-[13px] border-t border-line">
              <td className="px-4 py-2 font-medium">{row.ticker}</td>
              <td className="px-4 py-2 tabular text-right">{sideCell(row.buys, row.buyVolume, "buy")}</td>
              <td className="px-4 py-2 tabular text-right">{sideCell(row.sells, row.sellVolume, "sell")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Compras e vendas de insiders das empresas em carteira. */
export function GovernancaInsider() {
  const [month, setMonth] = React.useState("");
  const [company, setCompany] = React.useState("");
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
  const groups = groupByCargo(visible);
  const companyTotals = totalsByCompany(visible);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink tracking-tight">Insider trade</h2>
          <p className="text-xs text-ink/45 mt-0.5">
            Carteira · total de compras e vendas por empresa
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
      {companyTotals.length > 0 && <CompanyTotalsTable rows={companyTotals} />}
      {payload && groups.length === 0 && (
        <p className="text-sm text-ink/50 py-6 text-center border border-line bg-white">
          Nenhuma compra ou venda neste mês.
        </p>
      )}
      {groups.map((group) => (
        <article key={group.cargo} className="border border-line bg-white">
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 bg-surface-soft border-b border-line">
            <h3 className="text-sm font-medium text-ink">{group.cargo}</h3>
            <p className="text-[11px] text-ink/50 tabular">
              {group.rows.length}{" "}
              {group.rows.length === 1 ? "operação" : "operações"}
              {group.buyVolume > 0 && (
                <span className="text-emerald-800"> · compra {reais(group.buyVolume)}</span>
              )}
              {group.sellVolume > 0 && (
                <span className="text-rose-800"> · venda {reais(group.sellVolume)}</span>
              )}
            </p>
          </header>
          <Rows rows={group.rows} />
        </article>
      ))}
    </section>
  );
}
