"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { CompanyLogo } from "@/components/company-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { sectorPt } from "@/lib/sector-labels";
import { formatDateShort, formatValue } from "@/lib/format";
import { useLivePrices, type LivePrice } from "@/lib/use-live-prices";
import type { LsegViewRow } from "@/lib/lseg-transform";
import { GovernancaRemuneracaoDialog } from "@/components/governanca-remuneracao";
import { GovernancaCeoCard } from "@/components/governanca-ceo-card";
import { GovernancaOwnershipCard } from "@/components/governanca-ownership";
import { GovernancaCompanySummary } from "@/components/governanca-company-summary";
import { GovernancaBoardCard } from "@/components/governanca-board-card";

type Props = { ticker: string };

/** Tela cheia de governança de um papel. */
export function GovernancaEmpresa({ ticker }: Props) {
  const [row, setRow] = React.useState<LsegViewRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openRemuneracao, setOpenRemuneracao] = React.useState(false);
  const { prices: livePrices } = useLivePrices([ticker]);

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
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <CompanyLogo ticker={row.empresa} />
              <div className="flex items-center gap-6 min-w-0">
                <div className="min-w-0">
                  <h1 className="font-display text-xl text-ink tracking-tight leading-none">
                    {row.empresa}
                  </h1>
                  <p className="text-xs text-ink/50 truncate mt-1">
                    {row.name ?? "—"}
                    {row.sector ? ` · ${sectorPt(row.sector)}` : ""}
                  </p>
                </div>
                <QuoteBesideTicker
                  live={livePrices.get(row.empresa)}
                  fallback={row.price?.value ?? null}
                  fallbackDate={row.price?.date ?? null}
                />
              </div>
            </div>

            <GovernancaCompanySummary ticker={row.empresa} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-8">
                <GovernancaCeoCard ticker={row.empresa} />
              </div>
              <div className="lg:col-span-4 space-y-4">
                <button
                  type="button"
                  onClick={() => setOpenRemuneracao(true)}
                  className="w-full border border-line bg-white p-5 text-left hover:border-brand/40 hover:shadow-sm transition group"
                >
                  <div className="text-[10px] uppercase tracking-[0.16em] text-ink/40">
                    CVM · exercício 2025
                  </div>
                  <h2 className="font-display text-lg text-ink tracking-tight mt-2">
                    Remuneração dos Executivos
                  </h2>
                  <p className="text-xs text-ink/45 mt-2 leading-relaxed">
                    Diretoria estatutária, órgãos e comparação com métricas da
                    companhia.
                  </p>
                  <div className="mt-4 text-[10px] uppercase tracking-[0.14em] text-ink/30 group-hover:text-brand transition">
                    Abrir →
                  </div>
                </button>
                <GovernancaBoardCard ticker={row.empresa} />
                <GovernancaOwnershipCard ticker={row.empresa} />
              </div>
            </div>

            <GovernancaRemuneracaoDialog
              ticker={row.empresa}
              companyName={row.name}
              open={openRemuneracao}
              onClose={() => setOpenRemuneracao(false)}
            />
          </div>
        )}
      </main>
    </div>
  );
}

function QuoteBesideTicker({
  live,
  fallback,
  fallbackDate,
}: {
  live?: LivePrice;
  fallback: number | null;
  fallbackDate: string | null;
}) {
  const price = live?.price ?? fallback;
  if (price == null) return null;
  const ccy = live
    ? live.currency === "BRL"
      ? "R$"
      : live.currency
    : "R$";
  const date = live?.asOf ?? fallbackDate;
  const dateLabel = date ? formatDateShort(date) : null;

  return (
    <div className="flex flex-col justify-center">
      <span className="font-mono tabular text-xl text-ink leading-none">
        {formatValue(price, "money", ccy)}
      </span>
      <span className="text-xs text-ink/45 mt-1">
        {dateLabel ? `Fechamento ${dateLabel}` : "Fechamento"}
      </span>
    </div>
  );
}
