"use client";

import * as React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { CompanyLogo } from "@/components/company-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { sectorPt } from "@/lib/sector-labels";
import { GovernancaCalendario } from "@/components/governanca-calendario";
import type { LsegViewRow } from "@/lib/lseg-transform";

function GovernanceCard({ row }: { row: LsegViewRow }) {
  return (
    <Link
      href={`/governanca/${row.empresa}`}
      className="text-left border border-line bg-white p-4 hover:border-brand/40 hover:shadow-sm transition group block"
    >
      <div className="flex items-center gap-3">
        <CompanyLogo ticker={row.empresa} />
        <div className="min-w-0">
          <div className="font-medium text-ink text-sm truncate">
            {row.empresa}
          </div>
          <div className="text-xs text-ink/50 truncate">
            {row.name ?? "—"}
          </div>
        </div>
      </div>

      {row.sector && (
        <div className="mt-3 inline-flex items-center h-6 px-2 rounded-sm bg-surface border border-line text-[10px] uppercase tracking-[0.1em] text-ink/55">
          {sectorPt(row.sector)}
        </div>
      )}

      <div className="mt-3 text-[10px] uppercase tracking-[0.14em] text-ink/30 group-hover:text-brand transition">
        Ver detalhes →
      </div>
    </Link>
  );
}

/** Página Governança: grid de empresas em carteira, cards clicáveis. */
export function GovernancaDashboard() {
  const [rows, setRows] = React.useState<LsegViewRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/lseg", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) setRows(json as LsegViewRow[]);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Erro ao carregar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const portfolio = React.useMemo(
    () =>
      rows
        .filter((r) => r.inPortfolio)
        .sort((a, b) => a.empresa.localeCompare(b.empresa)),
    [rows]
  );

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader active="governanca" subtitle="Governança" />

      <main className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-5 md:py-8 flex-1">
        {error && (
          <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3 mb-5">
            {error}
          </p>
        )}

        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg text-ink tracking-tight">
              Empresas em carteira
            </h2>
            <p className="text-xs text-ink/45 mt-0.5">
              {loading ? "Carregando…" : `${portfolio.length} empresas`} · clique
              para abrir detalhes de governança
            </p>
          </div>
          <GovernancaCalendario
            portfolioTickers={portfolio.map((r) => r.empresa)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[132px]" />
            ))}
          </div>
        ) : portfolio.length === 0 ? (
          <p className="text-sm text-ink/50 py-10 text-center">
            Nenhuma empresa marcada como carteira.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {portfolio.map((row) => (
              <GovernanceCard key={row.ric} row={row} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
