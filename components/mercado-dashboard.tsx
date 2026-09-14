"use client";

import * as React from "react";
import { AppHeader } from "@/components/app-header";
import { MercadoReturnTable } from "@/components/mercado-return-table";
import { MercadoLineChart } from "@/components/mercado-line-chart";
import { MercadoCurveChart } from "@/components/mercado-curve-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import type { MarketPayload, MarketRow } from "@/lib/mercado";
import { cn } from "@/lib/utils";

type Period = "week" | "month";

function rowsOf(payload: MarketPayload, group: string): MarketRow[] {
  return payload.rows.filter((r) => r.group === group);
}

function seriesOf(payload: MarketPayload, rics: string[]) {
  return rics
    .map((ric) => {
      const row = payload.rows.find((r) => r.ric === ric);
      const points = payload.series[ric];
      if (!row || !points?.length) return null;
      return { name: row.name, points };
    })
    .filter((s): s is { name: string; points: NonNullable<typeof payload.series[string]> } => !!s);
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg text-ink tracking-tight">{title}</h2>
        {hint && <p className="text-xs text-ink/45 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function CdiStrip({ rows }: { rows: MarketRow[] }) {
  const taxa = rows.find((r) => r.ric === "RTDI1=B3");
  const acc = [
    { key: "1M", ric: "BRCDIACC1M=RR" },
    { key: "3M", ric: "BRCDIACC3M=RR" },
    { key: "6M", ric: "BRCDIACC6M=RR" },
    { key: "12M", ric: "BRCDIACC1Y=RR" },
  ];
  return (
    <div className="border border-line bg-white">
      <div className="px-3 py-2.5 border-b border-line">
        <h4 className="text-[10px] uppercase tracking-[0.14em] font-medium text-ink/70">
          CDI
        </h4>
        <p className="text-[11px] text-ink/40 mt-0.5">
          Taxa overnight B3 e retorno acumulado no período. Sem cota diária.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-line">
        <div className="px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-ink/45">
            Taxa % a.a.
          </div>
          <div className="font-mono text-lg tabular mt-1">
            {taxa?.last == null ? "—" : `${formatNumber(taxa.last, 2)}%`}
          </div>
        </div>
        {acc.map((a) => {
          const row = rows.find((r) => r.ric === a.ric);
          return (
            <div key={a.key} className="px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.14em] text-ink/45">
                Acumulado {a.key}
              </div>
              <div className="font-mono text-lg tabular mt-1">
                {row?.last == null ? "—" : `${formatNumber(row.last, 2)}%`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MercadoDashboard() {
  const [payload, setPayload] = React.useState<MarketPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [period, setPeriod] = React.useState<Period>("month");
  const days = period === "week" ? 7 : 31;

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/mercado?ts=${Date.now()}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) {
          setPayload(json as MarketPayload);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao carregar mercado");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const onFocus = () => {
      void load();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const equity = payload ? rowsOf(payload, "equity") : [];
  const anbima = payload ? rowsOf(payload, "fi_anbima") : [];
  const rates = payload ? rowsOf(payload, "rates") : [];
  const credit = payload ? rowsOf(payload, "credit") : [];
  const fx = payload ? rowsOf(payload, "fx") : [];
  const cmdty = payload ? rowsOf(payload, "commodity") : [];

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader
        active="mercado"
        subtitle="Painel do Mercado"
        lastUpdate={payload?.asOf}
      />

      <div className="bg-surface-soft border-b border-line">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center gap-3">
          <p className="text-xs text-ink/45 flex-1">
            Evolução semanal e mensal · fonte LSEG
          </p>
          <div className="flex items-center gap-1 rounded-md bg-surface p-1">
            {(["week", "month"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 h-8 text-[11px] uppercase tracking-[0.08em] font-medium rounded transition",
                  period === p
                    ? "bg-navy text-surface-soft"
                    : "text-ink/60 hover:text-ink"
                )}
              >
                {p === "week" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-5 md:py-8 space-y-8">
        {error && (
          <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3">
            {error}
          </p>
        )}
        {loading && (
          <div className="grid gap-3">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        )}
        {payload && (
          <>
            <Section title="Ibovespa e S&P 500">
              <div className="grid lg:grid-cols-2 gap-4">
                <MercadoReturnTable rows={equity} />
                <MercadoLineChart
                  title={period === "week" ? "Evolução 1 semana" : "Evolução 1 mês"}
                  days={days}
                  series={seriesOf(payload, [".BVSP", ".SPX", ".SPXTR"])}
                />
              </div>
            </Section>

            <Section
              title="Renda fixa Anbima e CDI"
              hint="ETFs como proxy dos índices. CDI entra como taxa e acumulado, sem cota diária."
            >
              <div className="grid lg:grid-cols-2 gap-4">
                <MercadoReturnTable rows={anbima} />
                <MercadoLineChart
                  title={period === "week" ? "Evolução 1 semana" : "Evolução 1 mês"}
                  days={days}
                  series={seriesOf(payload, [
                    "B5P211=SA",
                    "IMAB11=SA",
                    "B5MB11=SA",
                    "IRFM11=SA",
                  ])}
                />
              </div>
              <CdiStrip rows={rates} />
            </Section>

            <Section title="Crédito" hint="JGP IDEX não está na LSEG.">
              <div className="grid lg:grid-cols-2 gap-4">
                <MercadoReturnTable rows={credit} />
                <MercadoLineChart
                  title="IDA-DI"
                  days={days}
                  series={seriesOf(payload, [".ANBIIDADI"])}
                />
              </div>
            </Section>

            <Section title="Câmbio">
              <div className="grid lg:grid-cols-2 gap-4">
                <MercadoReturnTable rows={fx} />
                <MercadoLineChart
                  title="Dólar e DXY"
                  days={days}
                  series={seriesOf(payload, ["BRL=", ".DXY"])}
                />
              </div>
            </Section>

            <Section title="Commodities">
              <MercadoReturnTable rows={cmdty} />
              <div className="grid lg:grid-cols-2 gap-4">
                <MercadoLineChart
                  title="Energia e metais"
                  days={days}
                  series={seriesOf(payload, [
                    "LCOc1",
                    "CLc1",
                    "GCc1",
                    "HGc1",
                    "TIOc1",
                  ])}
                />
                <MercadoLineChart
                  title="Agrícolas"
                  days={days}
                  series={seriesOf(payload, ["Cc1", "Sc1", "KCc1", "SBc1"])}
                />
              </div>
            </Section>

            <Section
              title="Curvas de juros"
              hint="Hoje vs 1 semana vs 1 mês, por vértice."
            >
              <div className="grid md:grid-cols-2 gap-4">
                {payload.curves.map((c) => (
                  <MercadoCurveChart key={c.id} board={c} />
                ))}
              </div>
            </Section>
          </>
        )}
      </main>
    </div>
  );
}
