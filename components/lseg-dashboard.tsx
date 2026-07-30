"use client";

import * as React from "react";
import { AppHeader } from "@/components/app-header";
import { CompanySearch, CompanyChips } from "@/components/company-search";
import { SectorFilter } from "@/components/sector-filter";
import { MetricsSelector } from "@/components/metrics-selector";
import { ResearchTable } from "@/components/research-table";
import {
  SummaryCards,
  type SummaryData,
  type RatingFilterBucket,
} from "@/components/summary-cards";
import { classifyRating } from "@/lib/rating";
import { detectYears, latestActivityDate } from "@/lib/queries";
import type { LsegViewRow } from "@/lib/lseg-transform";
import { sectorPt } from "@/lib/sector-labels";
import { useLivePrices } from "@/lib/use-live-prices";
import {
  DEFAULT_LSEG_METRICS,
  LSEG_METRICS,
  YEARS_PER_METRIC,
  type MetricId,
} from "@/lib/metrics";

export function LsegDashboard() {
  const [allRows, setAllRows] = React.useState<LsegViewRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [empresas, setEmpresas] = React.useState<string[]>([]);
  const [setor, setSetor] = React.useState<string | undefined>();
  const [onlyPortfolio, setOnlyPortfolio] = React.useState(false);
  const [ratingBucket, setRatingBucket] =
    React.useState<RatingFilterBucket | null>(null);
  const [selectedMetrics, setSelectedMetrics] =
    React.useState<MetricId[]>(DEFAULT_LSEG_METRICS);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/lseg", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) setAllRows(json as LsegViewRow[]);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao carregar LSEG");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const portfolioTickers = React.useMemo(
    () => allRows.filter((r) => r.inPortfolio).map((r) => r.empresa),
    [allRows]
  );
  const portfolioSet = React.useMemo(
    () => new Set(portfolioTickers),
    [portfolioTickers]
  );

  const empresasOpts = React.useMemo(() => {
    const set = new Set(allRows.map((r) => r.empresa));
    return Array.from(set).sort();
  }, [allRows]);

  const setoresOpts = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) {
      if (r.sector) set.add(r.sector);
    }
    return Array.from(set).sort((a, b) => sectorPt(a).localeCompare(sectorPt(b)));
  }, [allRows]);

  const rows = React.useMemo(() => {
    return allRows.filter((r) => {
      if (onlyPortfolio && !r.inPortfolio) return false;
      if (empresas.length > 0 && !empresas.includes(r.empresa)) return false;
      if (setor && (r.sector ?? "") !== setor) return false;
      if (ratingBucket && classifyRating(r.rating?.value) !== ratingBucket)
        return false;
      return true;
    });
  }, [allRows, empresas, setor, onlyPortfolio, ratingBucket]);

  const years = React.useMemo(
    () => detectYears(allRows, selectedMetrics, YEARS_PER_METRIC),
    [allRows, selectedMetrics]
  );

  const uniqueTickers = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) set.add(r.empresa);
    return Array.from(set);
  }, [allRows]);

  const { prices: livePrices } = useLivePrices(uniqueTickers);

  const lastUpdate = React.useMemo(() => {
    let best: string | null = null;
    for (const r of allRows) {
      const d = latestActivityDate(r) ?? r.price?.date ?? null;
      if (d && (!best || d > best)) best = d;
    }
    return best;
  }, [allRows]);

  const summary: SummaryData | null = React.useMemo(() => {
    if (loading && allRows.length === 0) return null;
    let bullish = 0;
    let neutral = 0;
    let bearish = 0;
    let metricasTotal = 0;
    const portfolioInCoverage = new Set<string>();
    for (const r of allRows) {
      const bucket = classifyRating(r.rating?.value);
      if (bucket === "bullish") bullish++;
      else if (bucket === "neutral") neutral++;
      else if (bucket === "bearish") bearish++;
      if (portfolioSet.has(r.empresa)) portfolioInCoverage.add(r.empresa);
      if (r.byMetricYear) {
        for (const mid of Object.keys(r.byMetricYear)) {
          metricasTotal += Object.keys(r.byMetricYear[mid as MetricId] ?? {}).length;
        }
      }
    }
    return {
      empresasCount: allRows.length,
      portfolioCount: portfolioInCoverage.size,
      metricasTotal,
      bullishCount: bullish,
      neutralCount: neutral,
      bearishCount: bearish,
    };
  }, [allRows, loading, portfolioSet]);

  const hasFilters =
    empresas.length > 0 ||
    setor !== undefined ||
    onlyPortfolio ||
    ratingBucket !== null;

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader active="lseg" subtitle="Dados LSEG" lastUpdate={lastUpdate} />

      <div className="bg-surface-soft border-b border-line">
        <div className="mx-auto max-w-[1600px] px-8 py-4 flex items-center gap-3">
          <div className="w-[340px] shrink-0">
            <CompanySearch
              options={empresasOpts}
              selected={empresas}
              onChange={setEmpresas}
            />
          </div>
          <SectorFilter options={setoresOpts} value={setor} onChange={setSetor} />
          <div className="flex-1" />
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setEmpresas([]);
                setSetor(undefined);
                setOnlyPortfolio(false);
                setRatingBucket(null);
              }}
              className="text-xs text-ink/60 hover:text-brand underline-offset-4 hover:underline transition"
            >
              Limpar filtros
            </button>
          )}
        </div>
        {empresas.length > 0 && (
          <div className="mx-auto max-w-[1600px] px-8 pb-3 -mt-1">
            <CompanyChips
              selected={empresas}
              onRemove={(v) => setEmpresas(empresas.filter((x) => x !== v))}
            />
          </div>
        )}
        <div className="mx-auto max-w-[1600px] px-8 pb-3 flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink/50 font-medium shrink-0">
            Métricas ({selectedMetrics.length}/3)
          </span>
          <MetricsSelector
            value={selectedMetrics}
            onChange={setSelectedMetrics}
            metrics={LSEG_METRICS}
          />
        </div>
      </div>

      <main className="flex-1 mx-auto max-w-[1600px] w-full px-8 py-8 space-y-6">
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <SummaryCards
          data={summary}
          isLoading={loading && !summary}
          activeBucket={ratingBucket}
          onBucketChange={setRatingBucket}
          activePortfolio={onlyPortfolio}
          onPortfolioToggle={setOnlyPortfolio}
        />

        <ResearchTable
          data={rows}
          isLoading={loading}
          livePrices={livePrices}
          selectedMetrics={selectedMetrics}
          years={years}
          portfolioTickers={portfolioTickers}
        />
      </main>
    </div>
  );
}
