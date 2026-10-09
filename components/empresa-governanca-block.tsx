"use client";

import * as React from "react";
import { GovernancaRemuneracaoDialog } from "@/components/governanca-remuneracao";
import { GovernancaCeoCard } from "@/components/governanca-ceo-card";
import { GovernancaOwnershipCard } from "@/components/governanca-ownership";
import { GovernancaCompanySummary } from "@/components/governanca-company-summary";
import { GovernancaBoardCard } from "@/components/governanca-board-card";
import { GovernancaOfficersCard } from "@/components/governanca-officers-card";
import { GovernancaEventosTimeline } from "@/components/governanca-eventos-timeline";

type Props = { ticker: string; companyName: string | null };

/** Bloco de governança reutilizado na página da empresa. */
export function EmpresaGovernancaBlock({ ticker, companyName }: Props) {
  const [openRemuneracao, setOpenRemuneracao] = React.useState(false);

  return (
    <div className="space-y-5">
      <GovernancaEventosTimeline ticker={ticker} />
      <GovernancaCompanySummary ticker={ticker} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8">
          <GovernancaCeoCard ticker={ticker} />
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
          <GovernancaBoardCard ticker={ticker} />
          <GovernancaOfficersCard ticker={ticker} />
          <GovernancaOwnershipCard ticker={ticker} />
        </div>
      </div>

      <GovernancaRemuneracaoDialog
        ticker={ticker}
        companyName={companyName}
        open={openRemuneracao}
        onClose={() => setOpenRemuneracao(false)}
      />
    </div>
  );
}
