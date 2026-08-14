"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { CompanyLogo } from "@/components/company-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { sectorPt } from "@/lib/sector-labels";
import type { LsegViewRow } from "@/lib/lseg-transform";

type Props = { ticker: string };

/** Tela cheia de governança de um papel. */
export function GovernancaEmpresa({ ticker }: Props) {
  const [row, setRow] = React.useState<LsegViewRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/lseg", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        const rows = json as LsegViewRow[];
        const found =
          rows.find((r) => r.empresa.toUpperCase() === ticker.toUpperCase()) ??
          null;
        if (!cancelled) setRow(found);
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
  }, [ticker]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader active="governanca" subtitle="Governança" />

      <main className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-5 md:py-8 flex-1">
        <Link
          href="/governanca"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-ink/50 hover:text-brand transition mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Empresas em carteira
        </Link>

        {error && (
          <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3 mb-5">
            {error}
          </p>
        )}

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-80" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !row ? (
          <p className="text-sm text-ink/50 py-10">
            Empresa {ticker} não encontrada.
          </p>
        ) : (
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <CompanyLogo ticker={row.empresa} size="lg" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-ink/45">
                  Governança
                </div>
                <h1 className="font-display text-3xl text-ink tracking-tight mt-1">
                  {row.empresa}
                </h1>
                <p className="text-sm text-ink/50 mt-1">{row.name ?? "—"}</p>
                {row.sector && (
                  <div className="mt-3 inline-flex items-center h-6 px-2 rounded-sm bg-surface border border-line text-[10px] uppercase tracking-[0.1em] text-ink/55">
                    {sectorPt(row.sector)}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Link
                href={`/governanca/${row.empresa}/remuneracao`}
                className="border border-line bg-white p-5 hover:border-brand/40 hover:shadow-sm transition group text-left"
              >
                <div className="text-[10px] uppercase tracking-[0.18em] text-ink/40">
                  CVM · exercício 2025
                </div>
                <h2 className="font-display text-xl text-ink tracking-tight mt-2">
                  Remuneração dos Executivos
                </h2>
                <p className="text-xs text-ink/45 mt-2 leading-relaxed">
                  Diretoria estatutária, órgãos e comparação com métricas da
                  companhia.
                </p>
                <div className="mt-4 text-[10px] uppercase tracking-[0.14em] text-ink/30 group-hover:text-brand transition">
                  Abrir →
                </div>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
