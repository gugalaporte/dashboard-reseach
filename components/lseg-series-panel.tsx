"use client";

import * as React from "react";
import { LineChart as LineChartIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TickerSearch } from "@/components/ticker-search";
import { LsegCharts } from "@/components/lseg-charts";
import type { LsegSeriesPayload } from "@/lib/lseg-series";

type Props = {
  tickerOptions: string[];
};

export function LsegSeriesPanel({ tickerOptions }: Props) {
  const [ticker, setTicker] = React.useState<string>("");
  const [payload, setPayload] = React.useState<LsegSeriesPayload | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!ticker) {
      setPayload(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(
          `/api/lseg/series?ticker=${encodeURIComponent(ticker)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) setPayload(json as LsegSeriesPayload);
      } catch (e) {
        if (!cancelled) {
          setPayload(null);
          setError(e instanceof Error ? e.message : "Erro ao carregar série");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const enrichedFrom = React.useMemo(() => {
    if (!payload?.points.length) return null;
    for (const p of payload.points) {
      if (
        p.ret_1m != null ||
        p.price_52w_high != null ||
        p.enterprise_value != null ||
        p.price_target_median != null
      ) {
        return p.as_of_date;
      }
    }
    return null;
  }, [payload]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink tracking-tight">
            Série temporal LSEG
          </h2>
          <p className="text-xs text-ink/50 mt-1">
            Digite o ticker para filtrar. Os gráficos só carregam após a escolha.
          </p>
        </div>
        <TickerSearch
          options={tickerOptions}
          value={ticker}
          onChange={setTicker}
        />
      </div>

      {!ticker && (
        <div className="rounded-md border border-dashed border-line bg-surface-soft/50 px-6 py-16 text-center">
          <LineChartIcon className="w-8 h-8 text-ink/20 mx-auto" />
          <p className="mt-3 font-display text-base text-ink/70">
            Nenhum ticker selecionado
          </p>
          <p className="mt-1 text-sm text-ink/45">
            Busque um papel (ex.: PETR4) para ver preço, retornos e fundamentos.
          </p>
        </div>
      )}

      {ticker && error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {ticker && !loading && payload && enrichedFrom && (
        <p className="text-[11px] text-ink/45">
          Campos novos (retornos, 52W, alvos, EV…) preenchidos a partir de{" "}
          <span className="font-mono text-ink/70">{enrichedFrom}</span>
          {" · "}
          {payload.points.length} snapshots · {payload.ric}
        </p>
      )}

      {ticker && loading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[320px] rounded-md" />
          ))}
        </div>
      )}

      {ticker && !loading && payload && payload.points.length === 0 && (
        <div className="rounded-md border border-line bg-surface px-6 py-12 text-center text-sm text-ink/50">
          Sem pontos em <span className="font-mono">daily_snapshot</span> para{" "}
          <span className="font-semibold text-ink">{ticker}</span>
          {payload.ric ? ` (${payload.ric})` : ""}.
        </div>
      )}

      {ticker && !loading && payload && payload.points.length > 0 && (
        <LsegCharts ticker={payload.ticker} points={payload.points} />
      )}
    </section>
  );
}
