"use client";

import * as React from "react";
import { CompanySearch } from "@/components/company-search";
import { SourceFilter } from "@/components/source-filter";
import { DateFilter } from "@/components/date-filter";
import { SummaryCards } from "@/components/summary-cards";
import { ResearchTable } from "@/components/research-table";
import { CompanyDrawer } from "@/components/company-drawer";
import { Button } from "@/components/ui/button";
import {
  getEmpresas,
  getResearch,
  getSummaryStats,
  type SummaryStats,
} from "@/lib/queries";
import { formatDate } from "@/lib/format";
import type { PeriodoFilter, ResearchRow } from "@/types/research";

export default function DashboardPage() {
  // Filtros
  const [empresas, setEmpresas] = React.useState<string[]>([]);
  const [fonte, setFonte] = React.useState<string | undefined>();
  const [periodo, setPeriodo] = React.useState<PeriodoFilter>("all");

  // Dados
  const [empresasOpts, setEmpresasOpts] = React.useState<string[]>([]);
  const [rows, setRows] = React.useState<ResearchRow[]>([]);
  const [stats, setStats] = React.useState<SummaryStats | null>(null);
  const [loadingTable, setLoadingTable] = React.useState(true);
  const [loadingStats, setLoadingStats] = React.useState(true);

  // Drawer
  const [selectedEmpresa, setSelectedEmpresa] = React.useState<string | null>(null);

  // Carrega estatisticas + opcoes de empresas 1 vez
  React.useEffect(() => {
    getSummaryStats()
      .then(setStats)
      .catch((e) => console.error("stats:", e))
      .finally(() => setLoadingStats(false));
    getEmpresas()
      .then(setEmpresasOpts)
      .catch((e) => console.error("empresas:", e));
  }, []);

  // Recarrega tabela quando filtros mudam
  React.useEffect(() => {
    setLoadingTable(true);
    getResearch({ empresas, fonte, periodo })
      .then(setRows)
      .catch((e) => console.error("research:", e))
      .finally(() => setLoadingTable(false));
  }, [empresas, fonte, periodo]);

  function clearFilters() {
    setEmpresas([]);
    setFonte(undefined);
    setPeriodo("all");
  }

  const headerDate = stats?.ultimaAtualizacao
    ? formatDate(stats.ultimaAtualizacao)
    : "—";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header fixo */}
      <header className="h-14 bg-navy text-surface-soft flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
        <div className="font-semibold tracking-tight">Finacap Research</div>
        <div className="text-xs text-surface-soft/70">
          Atualizado em <span className="text-surface-soft font-medium">{headerDate}</span>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Cards de resumo */}
        <SummaryCards stats={stats} isLoading={loadingStats} />

        {/* Barra de filtros sticky abaixo do header */}
        <div className="sticky top-14 z-20 -mx-6 px-6 py-3 bg-surface-soft/90 backdrop-blur border-b border-line flex flex-wrap items-center gap-3">
          <CompanySearch
            options={empresasOpts}
            selected={empresas}
            onChange={setEmpresas}
          />
          <SourceFilter value={fonte} onChange={setFonte} />
          <DateFilter value={periodo} onChange={setPeriodo} />
          <Button variant="ghost" onClick={clearFilters} className="ml-auto">
            Limpar filtros
          </Button>
        </div>

        {/* Tabela principal */}
        <ResearchTable
          data={rows}
          isLoading={loadingTable}
          onRowClick={(r) => setSelectedEmpresa(r.empresa)}
        />
      </main>

      {/* Drawer lateral */}
      <CompanyDrawer
        empresa={selectedEmpresa}
        onClose={() => setSelectedEmpresa(null)}
      />
    </div>
  );
}
