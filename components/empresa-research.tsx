"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmpresaPdfs } from "@/components/empresa-pdfs";
import { sameCcy } from "@/lib/currency";
import { defaultCcyForTicker, getHistoricoEmpresa, getPdfsEmpresa } from "@/lib/queries";
import type { ResearchRow } from "@/lib/queries";
import type { MetricaRow, PdfDoc } from "@/types/research";
import { formatNumber, formatValue } from "@/lib/format";
import { buildHistoricoMatrix } from "@/lib/historico-matrix";
import type { LivePricesMap } from "@/lib/use-live-prices";
import { cn } from "@/lib/utils";

type Props = {
  tickers: string[];
  primary: string;
  consenso: ResearchRow[];
  livePrices?: LivePricesMap;
};

export function EmpresaResearch({ tickers, primary, consenso, livePrices }: Props) {
  const [hist, setHist] = React.useState<MetricaRow[]>([]);
  const [pdfs, setPdfs] = React.useState<PdfDoc[]>([]);
  const [loading, setLoading] = React.useState(true);
  const tickersKey = tickers.join("|");

  React.useEffect(() => {
    let cancelled = false;
    const ids = tickersKey ? tickersKey.split("|") : [];
    setLoading(true);
    Promise.all([
      Promise.all(ids.map((t) => getHistoricoEmpresa(t))),
      Promise.all(ids.map((t) => getPdfsEmpresa(t))),
    ])
      .then(([hists, pdfLists]) => {
        if (cancelled) return;
        setHist(hists.flat());
        const byId = new Map<number, PdfDoc>();
        for (const p of pdfLists.flat()) byId.set(p.id, p);
        setPdfs(
          [...byId.values()].sort((a, b) =>
            (b.pdf_date ?? "").localeCompare(a.pdf_date ?? "")
          )
        );
      })
      .catch((e) => console.error("Research empresa:", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tickersKey]);

  const { periodos, metricas, byMetrica } = React.useMemo(
    () => buildHistoricoMatrix(hist),
    [hist]
  );
  const yClose = primary ? livePrices?.get(primary) ?? null : null;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-[11px] uppercase tracking-[0.14em] text-ink/45 mb-3">
          Stock Guide
        </h3>
        {consenso.length === 0 ? (
          <p className="text-sm text-ink/50 border border-line bg-white px-4 py-6 text-center">
            Sem cobertura de consenso.
          </p>
        ) : (
          <div className="rounded-md border border-line overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-navy text-surface-soft/80 text-[10px] uppercase tracking-[0.14em]">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Casa</th>
                  <th className="text-left px-3 py-2 font-medium">Rating</th>
                  <th className="text-right px-3 py-2 font-medium">Preço</th>
                  <th className="text-right px-3 py-2 font-medium">Target</th>
                  <th className="text-right px-3 py-2 font-medium">Upside</th>
                </tr>
              </thead>
              <tbody>
                {consenso.map((c, idx) => {
                  const price = yClose?.price ?? c.price?.value ?? null;
                  const ccy =
                    yClose?.currency === "BRL"
                      ? "R$"
                      : yClose?.currency ?? defaultCcyForTicker(primary);
                  const target = c.target;
                  const upside =
                    price != null && target && sameCcy(target.ccy, ccy)
                      ? ((target.value - price) / price) * 100
                      : null;
                  return (
                    <tr
                      key={c.fonte}
                      className={cn("border-t border-line/60", idx % 2 === 1 && "bg-surface/40")}
                    >
                      <td className="px-3 py-2 font-medium">{c.fonte}</td>
                      <td className="px-3 py-2">{c.rating?.value ?? "–"}</td>
                      <td className="px-3 py-2 text-right font-mono tabular">
                        {price != null ? formatValue(price, "money", ccy) : "–"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular">
                        {target ? formatValue(target.value, "money", target.ccy) : "–"}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2 text-right font-mono tabular",
                          upside == null
                            ? "text-ink/35"
                            : upside >= 0
                              ? "text-emerald-700"
                              : "text-red-700"
                        )}
                      >
                        {upside == null
                          ? "–"
                          : `${upside >= 0 ? "+" : ""}${upside.toFixed(1)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EmpresaPdfs pdfs={pdfs} loading={loading} />

      <div>
        <h3 className="text-[11px] uppercase tracking-[0.14em] text-ink/45 mb-3">
          Histórico sell-side
        </h3>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : metricas.length === 0 ? (
          <p className="text-sm text-ink/50 border border-line bg-white px-4 py-6 text-center">
            Sem histórico estruturado.
          </p>
        ) : (
          <div className="overflow-x-auto border border-line bg-white">
            <table className="w-full text-xs">
              <thead className="bg-navy text-surface-soft/80 text-[10px] uppercase tracking-[0.14em]">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Métrica</th>
                  {periodos.map((p) => (
                    <th key={p} className="text-right px-3 py-2 font-medium tabular">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metricas.map((m, idx) => (
                  <tr
                    key={m}
                    className={cn("border-t border-line/60", idx % 2 === 1 && "bg-surface/40")}
                  >
                    <td className="px-3 py-2 font-medium">{m}</td>
                    {periodos.map((p) => {
                      const r = byMetrica.get(m)?.get(p);
                      return (
                        <td key={p} className="px-3 py-2 text-right font-mono tabular">
                          {r && r.valor != null
                            ? formatNumber(r.valor, r.unidade === "%" || r.unidade === "x" ? 1 : 0)
                            : "–"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
