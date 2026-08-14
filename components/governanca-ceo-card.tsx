"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { GovernancaRelatorioDialog } from "@/components/governanca-relatorio-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateShort } from "@/lib/format";
import { parseSynthesis, type CeoAnalise } from "@/lib/ceo-analise";

type Props = { ticker: string };

/** Card principal de liderança (síntese de ceo_analise). */
export function GovernancaCeoCard({ ticker }: Props) {
  const [data, setData] = React.useState<CeoAnalise | null | undefined>(
    undefined
  );
  const [error, setError] = React.useState<string | null>(null);
  const [openReport, setOpenReport] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setData(undefined);
    setError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/governanca/ceo?ticker=${encodeURIComponent(ticker)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) setData(json as CeoAnalise | null);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Erro ao carregar");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  if (error) {
    return (
      <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3">
        {error}
      </p>
    );
  }

  if (data === undefined) {
    return <Skeleton className="h-[28rem] w-full" />;
  }

  if (!data) {
    return (
      <p className="text-sm text-ink/50 py-10 text-center border border-line bg-white">
        Sem dossiê de CEO para {ticker}.
      </p>
    );
  }

  const parsed = parseSynthesis(data.synthesisText);
  const name = data.synthesisCeo || data.ceoName || "CEO";

  return (
    <>
      <article className="border border-line bg-white p-6 sm:p-8">
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink/45 font-medium">
          Liderança e C-suite
        </div>

        <div className="mt-5">
          {data.synthesisVeredito && (
            <div className="inline-flex items-center h-7 px-2.5 rounded-sm bg-brand/10 text-brand text-[11px] font-medium">
              {data.synthesisVeredito}
            </div>
          )}
          <h2 className="font-display text-2xl sm:text-3xl text-ink tracking-tight mt-2">
            {name}
          </h2>
        </div>

        {parsed.summary && (
          <p className="mt-5 text-sm text-ink/70 leading-relaxed">
            {parsed.summary}
          </p>
        )}

        {parsed.strengths.length > 0 && (
          <Section title="Pontos fortes" items={parsed.strengths} />
        )}
        {parsed.risks.length > 0 && (
          <Section title="Riscos" items={parsed.risks} />
        )}

        {data.updatedAt && (
          <p className="mt-6 text-[11px] text-ink/35">
            Atualizado em {formatDateShort(data.updatedAt.slice(0, 10))}
          </p>
        )}

        <div className="mt-4 flex items-start gap-2.5 border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-900/80 leading-relaxed">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
          <span>
            Síntese gerada a partir de fontes públicas. Confira os relatórios
            completos e as fontes originais antes de usar na tese.
          </span>
        </div>

        <button
          type="button"
          onClick={() => setOpenReport(true)}
          className="mt-4 w-full h-10 border border-line text-sm text-ink hover:border-brand/40 hover:text-brand transition"
        >
          Ver relatório completo
        </button>
      </article>

      <GovernancaRelatorioDialog
        data={data}
        open={openReport}
        onClose={() => setOpenReport(false)}
      />
    </>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="mt-6">
      <h3 className="text-[10px] uppercase tracking-[0.16em] text-ink/45 font-medium mb-2">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.slice(0, 48)}
            className="text-sm text-ink/70 leading-relaxed pl-3.5 relative before:content-['•'] before:absolute before:left-0 before:text-ink/40"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
