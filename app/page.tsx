"use client";

import * as React from "react";
import Image from "next/image";
import { CompanySearch, CompanyChips } from "@/components/company-search";
import { SourceFilter } from "@/components/source-filter";
import { DateFilter } from "@/components/date-filter";
import { SummaryCards } from "@/components/summary-cards";
import { ResearchTable } from "@/components/research-table";
import { CompanyDrawer } from "@/components/company-drawer";
import {
  getEmpresas,
  getResearch,
  getSummaryStats,
  latestActivityDate,
  type SummaryStats,
  type ResearchRow,
} from "@/lib/queries";
import { formatDateLong } from "@/lib/format";
import type { PeriodoFilter } from "@/types/research";

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
  const [fonte, setFonte] = React.useState<string | undefined>();
  const [periodo, setPeriodo] = React.useState<PeriodoFilter>("all");

  const [empresasOpts, setEmpresasOpts] = React.useState<string[]>([]);
  const [allRows, setAllRows] = React.useState<ResearchRow[]>([]);
  const [stats, setStats] = React.useState<SummaryStats | null>(null);
  const [loadingTable, setLoadingTable] = React.useState(true);
  const [loadingStats, setLoadingStats] = React.useState(true);

  const [selectedEmpresa, setSelectedEmpresa] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    getSummaryStats()
      .then(setStats)
      .catch((e) => console.error("stats:", e))
      .finally(() => setLoadingStats(false));

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
      if (fonte && r.fonte !== fonte) return false;
      if (minDate) {
        const d = latestActivityDate(r);
        if (!d || d < minDate) return false;
      }
      return true;
    });
  }, [allRows, empresas, fonte, periodo]);

  // Consenso do drawer: todas as rows da empresa selecionada.
  const consensoDrawer = React.useMemo(
    () =>
      selectedEmpresa
        ? allRows.filter((r) => r.empresa === selectedEmpresa)
        : [],
    [allRows, selectedEmpresa]
  );

  function clearFilters() {
    setEmpresas([]);
    setFonte(undefined);
    setPeriodo("all");
  }

  const hasFilters =
    empresas.length > 0 || fonte !== undefined || periodo !== "all";

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
          <div className="text-right leading-tight">
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
          <div className="flex-1 max-w-md">
            <CompanySearch
              options={empresasOpts}
              selected={empresas}
              onChange={setEmpresas}
            />
          </div>
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
      </div>

      <main className="flex-1 mx-auto max-w-[1600px] w-full px-8 py-8 space-y-8">
        <SummaryCards stats={stats} isLoading={loadingStats} />

        <ResearchTable
          data={rows}
          isLoading={loadingTable}
          onRowClick={(r) => setSelectedEmpresa(r.empresa)}
        />
      </main>

      <CompanyDrawer
        empresa={selectedEmpresa}
        consenso={consensoDrawer}
        onClose={() => setSelectedEmpresa(null)}
      />
    </div>
  );
}
