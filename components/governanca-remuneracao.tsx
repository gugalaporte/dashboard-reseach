"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { CompanyLogo } from "@/components/company-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RemuneracaoPayload } from "@/lib/governanca-remuneracao";

function fmtMoney(v: number | null): string {
  if (v == null) return "–";
  return `R$ ${formatNumber(v, 0)}`;
}

function fmtPct(v: number | null): string {
  if (v == null) return "–";
  return `${formatNumber(v, 2)}%`;
}

function fmtNum(v: number | null): string {
  if (v == null) return "–";
  return formatNumber(v, 2);
}

type TabId = "csuite" | "orgao" | "top3";

/** Tela de remuneração dos executivos (CVM). */
export function GovernancaRemuneracao({ ticker }: { ticker: string }) {
  const [data, setData] = React.useState<RemuneracaoPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<TabId>("csuite");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/governanca/remuneracao?ticker=${encodeURIComponent(ticker)}`,
          { cache: "no-store" }
        );
        const json = (await res.json()) as RemuneracaoPayload & {
          error?: string;
        };
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) setData(json);
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

      <main className="mx-auto max-w-[960px] w-full px-4 sm:px-6 lg:px-8 py-5 md:py-8 flex-1">
        <Link
          href={`/governanca/${ticker}`}
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-ink/50 hover:text-brand transition mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar
        </Link>

        {error && (
          <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3 mb-5">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 mb-6">
          <CompanyLogo ticker={ticker} />
          <div>
            <h1 className="font-display text-2xl text-ink tracking-tight">
              Remuneração dos Executivos
            </h1>
            <p className="text-sm text-ink/50">
              {ticker}
              {data?.companyName ? ` · ${data.companyName}` : ""}
            </p>
          </div>
        </div>

        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : !data || data.totalDiretoria == null ? (
          <p className="text-sm text-ink/50 py-10 text-center border border-line bg-white">
            Sem remuneração CVM para {ticker} no exercício 2025.
          </p>
        ) : (
          <div className="border border-line bg-white p-5 sm:p-6">
            <p className="text-sm text-ink/55 mb-4">
              Ano-base da remuneração (exercício fiscal):{" "}
              <span className="font-semibold text-ink">{data.year}</span>
              {" — "}
              {data.orgaoFoco} (C-suite)
            </p>

            <div className="flex flex-wrap gap-2 mb-5">
              {(
                [
                  ["csuite", "C-suite x métricas"],
                  ["orgao", "Por órgão"],
                  ["top3", "Comparação com Top 3"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "h-8 px-3 rounded-full text-xs font-medium transition",
                    tab === id
                      ? "bg-brand/10 text-brand"
                      : "text-ink/55 hover:text-ink hover:bg-surface"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tab === "csuite" && <CsuiteTable data={data} />}
            {tab === "orgao" && <OrgaoTable data={data} />}
            {tab === "top3" && (
              <p className="text-sm text-ink/40 py-8 text-center">
                Comparação com o Top 3 do setor em construção.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function CsuiteTable({ data }: { data: RemuneracaoPayload }) {
  const rows: Array<[string, string]> = [
    ["Remuneração total (diretoria)", fmtMoney(data.totalDiretoria)],
    ["Nº médio de membros", fmtNum(data.membrosDiretoria)],
    ["% do EBITDA", fmtPct(data.pctEbitda)],
    ["% do faturamento", fmtPct(data.pctReceita)],
    ["% do lucro líquido", fmtPct(data.pctLucro)],
    ["Fonte", data.fonte],
  ];
  return (
    <dl>
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4 py-3 border-b border-line last:border-b-0"
        >
          <dt className="text-[11px] uppercase tracking-[0.12em] text-ink/50">
            {label}
          </dt>
          <dd className="text-sm text-ink tabular">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function fmtMembros(v: number | null): string {
  if (v == null) return "–";
  if (Number.isInteger(v)) return formatNumber(v, 0);
  return formatNumber(v, 2);
}

function OrgaoTable({ data }: { data: RemuneracaoPayload }) {
  if (data.orgaos.length === 0) {
    return (
      <p className="text-sm text-ink/40 py-8 text-center">Sem dados por órgão.</p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-[minmax(10rem,1.4fr)_repeat(5,minmax(5.5rem,1fr))] gap-x-3 min-w-[44rem]">
        <div className="contents text-[10px] uppercase tracking-[0.12em] text-ink/45">
          <span className="py-2.5 border-b border-line">Órgão</span>
          <span className="py-2.5 border-b border-line">Nº membros</span>
          <span className="py-2.5 border-b border-line">Total</span>
          <span className="py-2.5 border-b border-line">Salário</span>
          <span className="py-2.5 border-b border-line">Bônus</span>
          <span className="py-2.5 border-b border-line">Baseada em ações</span>
        </div>
        {data.orgaos.map((o) => (
          <div key={o.orgao} className="contents text-sm">
            <span className="py-3 border-b border-line text-ink/80">
              {o.orgao}
            </span>
            <span className="py-3 border-b border-line tabular">
              {fmtMembros(o.membros)}
            </span>
            <span className="py-3 border-b border-line tabular">
              {fmtMoney(o.total)}
            </span>
            <span className="py-3 border-b border-line tabular">
              {fmtMoney(o.salario)}
            </span>
            <span className="py-3 border-b border-line tabular">
              {fmtMoney(o.bonus)}
            </span>
            <span className="py-3 border-b border-line tabular">
              {fmtMoney(o.baseadaAcoes)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
