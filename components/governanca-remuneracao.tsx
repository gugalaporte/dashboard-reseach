"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

function fmtMembros(v: number | null): string {
  if (v == null) return "–";
  if (Number.isInteger(v)) return formatNumber(v, 0);
  return formatNumber(v, 2);
}

type TabId = "csuite" | "orgao" | "top3";

type Props = {
  ticker: string;
  companyName?: string | null;
  open: boolean;
  onClose: () => void;
};

/** Popup de remuneração dos executivos (CVM). */
export function GovernancaRemuneracaoDialog({
  ticker,
  companyName,
  open,
  onClose,
}: Props) {
  const [data, setData] = React.useState<RemuneracaoPayload | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<TabId>("csuite");

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTab("csuite");
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
  }, [open, ticker]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <div className="px-5 sm:px-6 pt-5 pr-12 border-b border-line shrink-0">
          <DialogTitle className="font-display text-xl text-ink tracking-tight">
            Remuneração dos Executivos
          </DialogTitle>
          <p className="text-sm text-ink/50 mt-1 pb-4">
            {ticker}
            {companyName ? ` · ${companyName}` : ""}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 sm:px-6 py-5">
          {error && (
            <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3 mb-4">
              {error}
            </p>
          )}

          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : !data || data.totalDiretoria == null ? (
            <p className="text-sm text-ink/50 py-10 text-center">
              Sem remuneração CVM para {ticker} no exercício 2025.
            </p>
          ) : (
            <>
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
