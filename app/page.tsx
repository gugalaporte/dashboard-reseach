"use client";

import * as React from "react";
import Image from "next/image";
import { CompanySearch, CompanyChips } from "@/components/company-search";
import { SectorFilter } from "@/components/sector-filter";
import { SourceFilter } from "@/components/source-filter";
import { DateFilter } from "@/components/date-filter";
import { MetricsSelector } from "@/components/metrics-selector";
import { ResearchTable } from "@/components/research-table";
import { CompanyDrawer } from "@/components/company-drawer";
import {
  SummaryCards,
  type SummaryData,
  type RatingFilterBucket,
} from "@/components/summary-cards";
import { classifyRating } from "@/lib/rating";
import {
  detectYears,
  getEmpresas,
  getResearch,
  getSummaryStats,
  latestActivityDate,
  type SummaryStats,
  type ResearchRow,
} from "@/lib/queries";
import { formatDateLong } from "@/lib/format";
import { useLivePrices } from "@/lib/use-live-prices";
import {
  DEFAULT_METRICS,
  YEARS_PER_METRIC,
  type MetricId,
} from "@/lib/metrics";
import type { PeriodoFilter } from "@/types/research";
import { sectorPt } from "@/lib/sector-labels";

// Converte periodo filtro em data minima (ISO yyyy-mm-dd).
function periodoToMinDate(p: PeriodoFilter): string | null {
  if (p === "all") return null;
  const days = p === "7d" ? 7 : p === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [empresas, setEmpresas] = React.useState<string[]>([]);
  const [setor, setSetor] = React.useState<string | undefined>();
  const [fonte, setFonte] = React.useState<string | undefined>();
  const [periodo, setPeriodo] = React.useState<PeriodoFilter>("all");
  // Bucket de rating ativo (clicando no summary card). null = sem filtro.
  const [ratingBucket, setRatingBucket] =
    React.useState<RatingFilterBucket | null>(null);

  const [empresasOpts, setEmpresasOpts] = React.useState<string[]>([]);
  const [allRows, setAllRows] = React.useState<ResearchRow[]>([]);
  // stats ainda e usado apenas pela "Ultima atualizacao" do header superior.
  const [stats, setStats] = React.useState<SummaryStats | null>(null);
  const [loadingTable, setLoadingTable] = React.useState(true);

  const [selectedEmpresa, setSelectedEmpresa] = React.useState<string | null>(
    null
  );

  // Metricas selecionadas pelo usuario (1..3). Default: P/E, EV/EBITDA, DY.
  const [selectedMetrics, setSelectedMetrics] =
    React.useState<MetricId[]>(DEFAULT_METRICS);

  React.useEffect(() => {
    getSummaryStats()
      .then(setStats)
      .catch((e) => console.error("stats:", e));

    getEmpresas()
      .then(setEmpresasOpts)
      .catch((e) => console.error("empresas:", e));

    getResearch()
      .then(setAllRows)
      .catch((e) => console.error("research:", e))
      .finally(() => setLoadingTable(false));
  }, []);

  // Filtros aplicados em memoria.
  const rows = React.useMemo(() => {
    const minDate = periodoToMinDate(periodo);
    return allRows.filter((r) => {
      if (empresas.length > 0 && !empresas.includes(r.empresa)) return false;
      if (setor && (r.sector ?? "") !== setor) return false;
      if (fonte && r.fonte !== fonte) return false;
      if (ratingBucket && classifyRating(r.rating?.value) !== ratingBucket)
        return false;
      if (minDate) {
        const d = latestActivityDate(r);
        if (!d || d < minDate) return false;
      }
      return true;
    });
  }, [allRows, empresas, setor, fonte, periodo, ratingBucket]);

  // Setores disponiveis a partir dos dados carregados.
  const setoresOpts = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) {
      if (r.sector) set.add(r.sector);
    }
    return Array.from(set).sort((a, b) => sectorPt(a).localeCompare(sectorPt(b)));
  }, [allRows]);

  // Consenso do drawer: todas as rows da empresa selecionada.
  const consensoDrawer = React.useMemo(
    () =>
      selectedEmpresa
        ? allRows.filter((r) => r.empresa === selectedEmpresa)
        : [],
    [allRows, selectedEmpresa]
  );

  // Tickers unicos visiveis no dashboard. Usamos allRows (nao as filtradas)
  // para o mapa persistir mesmo quando o usuario filtra por fonte/periodo.
  const uniqueTickers = React.useMemo(() => {
    const set = new Set<string>();
    for (const r of allRows) set.add(r.empresa);
    return Array.from(set);
  }, [allRows]);

  const { prices: livePrices } = useLivePrices(uniqueTickers);

  // Anos dinamicos a partir das rows + metricas selecionadas (ex.: ["2026","2027","2028"]).
  const years = React.useMemo(
    () => detectYears(allRows, selectedMetrics, YEARS_PER_METRIC),
    [allRows, selectedMetrics]
  );

  // Dados dos summary cards. empresas/metricas vem do stats global (DB),
  // bullish/neutral contam recomendacoes (1 por par empresa+banco) em allRows.
  const summary: SummaryData | null = React.useMemo(() => {
    if (!stats) return null;
    let bullish = 0;
    let neutral = 0;
    let bearish = 0;
    for (const r of allRows) {
      const bucket = classifyRating(r.rating?.value);
      if (bucket === "bullish") bullish++;
      else if (bucket === "neutral") neutral++;
      else if (bucket === "bearish") bearish++;
    }
    return {
      empresasCount: stats.empresasCount,
      metricasTotal: stats.metricasTotal,
      bullishCount: bullish,
      neutralCount: neutral,
      bearishCount: bearish,
    };
  }, [stats, allRows]);

  function clearFilters() {
    setEmpresas([]);
    setSetor(undefined);
    setFonte(undefined);
    setPeriodo("all");
    setRatingBucket(null);
  }

  const hasFilters =
    empresas.length > 0 ||
    setor !== undefined ||
    fonte !== undefined ||
    periodo !== "all" ||
    ratingBucket !== null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header editorial */}
      <header className="sticky top-0 z-40 bg-navy text-surface-soft border-b border-ink/30">
        <div className="mx-auto max-w-[1600px] h-16 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-surface-soft grid place-items-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="Finacap"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-[17px] tracking-tight">
                Finacap Research
              </span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-surface-soft/60 mt-1">
                Equity Dashboard
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center text-center leading-tight">
            <div className="text-[10px] uppercase tracking-[0.18em] text-surface-soft/60">
              Última atualização
            </div>
            <div className="font-mono text-sm tabular mt-1">
              {stats ? formatDateLong(stats.ultimaAtualizacao) : "–"}
            </div>
          </div>
        </div>
      </header>

      {/* Barra de filtros em linha unica, sticky abaixo do header */}
      <div className="sticky top-16 z-30 bg-surface-soft border-b border-line">
        <div className="mx-auto max-w-[1600px] px-8 py-4 flex items-center gap-3">
          <div className="w-[340px] shrink-0">
            <CompanySearch
              options={empresasOpts}
              selected={empresas}
              onChange={setEmpresas}
            />
          </div>
          <SectorFilter options={setoresOpts} value={setor} onChange={setSetor} />
          <div className="h-6 w-px bg-line" />
          <SourceFilter value={fonte} onChange={setFonte} />
          <DateFilter value={periodo} onChange={setPeriodo} />
          <div className="flex-1" />
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
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
        {/* Segunda linha: seletor de metricas (max 3). Separada para caber as pills. */}
        <div className="mx-auto max-w-[1600px] px-8 pb-3 flex items-center gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink/50 font-medium shrink-0">
            Métricas ({selectedMetrics.length}/3)
          </span>
          <MetricsSelector
            value={selectedMetrics}
            onChange={setSelectedMetrics}
          />
        </div>
      </div>

      <main className="flex-1 mx-auto max-w-[1600px] w-full px-8 py-8 space-y-6">
        <SummaryCards
          data={summary}
          isLoading={loadingTable && !summary}
          activeBucket={ratingBucket}
          onBucketChange={setRatingBucket}
        />
        <ResearchTable
          data={rows}
          isLoading={loadingTable}
          onRowClick={(r) => setSelectedEmpresa(r.empresa)}
          livePrices={livePrices}
          selectedMetrics={selectedMetrics}
          years={years}
        />
      </main>

      <CompanyDrawer
        empresa={selectedEmpresa}
        consenso={consensoDrawer}
        onClose={() => setSelectedEmpresa(null)}
        livePrices={livePrices}
      />
    </div>
  );
}
