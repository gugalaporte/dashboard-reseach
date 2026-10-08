"use client";

import * as React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { CompanyLogo } from "@/components/company-logo";
import { EmpresaOverview } from "@/components/empresa-overview";
import { EmpresaResearch } from "@/components/empresa-research";
import { EmpresaScreening } from "@/components/empresa-screening";
import { EmpresaGovernancaBlock } from "@/components/empresa-governanca-block";
import { BottomUpQualitative } from "@/components/bottom-up-qualitative";
import { Skeleton } from "@/components/ui/skeleton";
import { getResearch, type ResearchRow } from "@/lib/queries";
import type { FactorRow } from "@/lib/factor-scoring";
import type { LsegViewRow } from "@/lib/lseg-transform";
import { displayTicker } from "@/lib/finacap-book";
import { issuerKey } from "@/lib/governanca-portfolio";
import {
  EMPRESA_TABS,
  parseEmpresaTab,
  latestConsensoByFonte,
  pickEmpresaRow,
  siblingTickers,
  type EmpresaTab,
} from "@/lib/empresa";
import { sectorPt } from "@/lib/sector-labels";
import { useLivePrices } from "@/lib/use-live-prices";
import { cn } from "@/lib/utils";

const TAB_LABEL: Record<EmpresaTab, string> = {
  visao: "Visão",
  research: "Research",
  screening: "Screening",
  tese: "Tese",
  governanca: "Governança",
};

type Props = { ticker: string; initialTab?: string };

/** Página única da empresa: research, screening, tese e governança. */
export function EmpresaPage({ ticker, initialTab }: Props) {
  const papel = displayTicker(ticker).trim().toUpperCase();
  const [research, setResearch] = React.useState<ResearchRow[]>([]);
  const [lsegRows, setLsegRows] = React.useState<LsegViewRow[]>([]);
  const [factors, setFactors] = React.useState<FactorRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getResearch(),
      fetch("/api/lseg", { cache: "no-store" }).then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
        return j as LsegViewRow[];
      }),
      fetch("/api/factors", { cache: "no-store" }).then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
        return (j.rows ?? []) as FactorRow[];
      }),
    ])
      .then(([res, lseg, fac]) => {
        if (cancelled) return;
        setResearch(res);
        setLsegRows(lseg);
        setFactors(fac);
      })
      .catch((e) => console.error("Empresa:", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [papel]);

  const lseg = React.useMemo(
    () => pickEmpresaRow(lsegRows, papel),
    [lsegRows, papel]
  );
  const factor = React.useMemo(
    () =>
      pickEmpresaRow(
        factors.map((f) => ({ ...f, empresa: f.ticker })),
        papel
      ),
    [factors, papel]
  );
  const consenso = React.useMemo(
    () =>
      latestConsensoByFonte(
        research.filter((r) => issuerKey(r.empresa) === issuerKey(papel)),
        papel
      ),
    [research, papel]
  );
  const tickers = React.useMemo(
    () =>
      siblingTickers(
        [
          ...research.map((r) => r.empresa),
          ...lsegRows.map((r) => r.empresa),
          ...factors.map((f) => f.ticker),
        ],
        papel
      ),
    [research, lsegRows, factors, papel]
  );
  const govTicker = lseg?.empresa ?? factor?.ticker ?? papel;
  const name = lseg?.name ?? factor?.name ?? null;
  const sector = lseg?.sector ?? factor?.sector ?? consenso[0]?.sector ?? null;
  const { prices: livePrices } = useLivePrices(tickers);
  const live = livePrices.get(papel) ?? livePrices.get(govTicker);

  React.useEffect(() => {
    const tab = parseEmpresaTab(initialTab);
    if (!tab) return;
    const t = window.setTimeout(() => {
      document.getElementById(tab)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [initialTab, papel]);

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader active="empresa" subtitle={papel} />

      <div className="bg-surface-soft border-b border-line">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-5 md:py-6">
          {loading ? (
            <Skeleton className="h-16 w-80" />
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <CompanyLogo ticker={govTicker} size="lg" />
              <div className="min-w-0">
                <h1 className="font-display text-2xl text-ink tracking-tight leading-none">
                  {papel}
                </h1>
                <p className="text-sm text-ink/50 truncate mt-1">
                  {name ?? "—"}
                  {sector ? ` · ${sectorPt(sector)}` : ""}
                </p>
                {tickers.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {tickers.map((t) => (
                      <Link
                        key={t}
                        href={`/empresa/${encodeURIComponent(t)}`}
                        className={cn(
                          "h-6 px-2 inline-flex items-center font-mono text-[11px] border",
                          t === papel
                            ? "bg-navy text-surface-soft border-navy"
                            : "bg-white text-ink/70 border-line hover:border-brand/40"
                        )}
                      >
                        {t}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <nav
        className="sticky top-14 md:top-16 z-30 bg-white/95 border-b border-line backdrop-blur"
        aria-label="Seções da empresa"
      >
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto">
          {EMPRESA_TABS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="px-3 h-10 inline-flex items-center text-[11px] uppercase tracking-[0.12em] text-ink/50 hover:text-ink whitespace-nowrap"
            >
              {TAB_LABEL[id]}
            </a>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-[1600px] w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8 flex-1 space-y-12">
        <section id="visao" className="scroll-mt-32">
          <SectionTitle>Visão geral</SectionTitle>
          {loading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <EmpresaOverview
              ticker={papel}
              lseg={lseg}
              factor={factor}
              consenso={consenso}
              live={live}
            />
          )}
        </section>

        <section id="research" className="scroll-mt-32">
          <SectionTitle>Research</SectionTitle>
          <EmpresaResearch
            tickers={tickers}
            primary={papel}
            consenso={consenso}
            livePrices={livePrices}
          />
        </section>

        <section id="screening" className="scroll-mt-32">
          <SectionTitle>Screening</SectionTitle>
          <EmpresaScreening ticker={govTicker} row={factor} />
        </section>

        <section id="tese" className="scroll-mt-32">
          <SectionTitle>Tese</SectionTitle>
          <BottomUpQualitative ticker={govTicker} />
        </section>

        <section id="governanca" className="scroll-mt-32">
          <SectionTitle>Governança</SectionTitle>
          <EmpresaGovernancaBlock ticker={govTicker} companyName={name} />
        </section>
      </main>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-lg text-ink tracking-tight mb-4">
      {children}
    </h2>
  );
}
