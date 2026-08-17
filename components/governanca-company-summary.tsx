"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { CeoAnalise } from "@/lib/ceo-analise";

type Props = { ticker: string };

/** Card com o resumo da empresa (ceo_analise.company_summary). */
export function GovernancaCompanySummary({ ticker }: Props) {
  const [text, setText] = React.useState<string | null | undefined>(undefined);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setText(undefined);
    setError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/governanca/ceo?ticker=${encodeURIComponent(ticker)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (cancelled) return;
        const row = json as CeoAnalise | null;
        setText(row?.companySummary?.trim() || null);
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

  if (text === undefined) return <Skeleton className="h-28 w-full" />;
  if (!text) return null;

  return (
    <article className="border border-line bg-white p-5 sm:p-6">
      <div className="text-[10px] uppercase tracking-[0.16em] text-ink/40">
        Empresa
      </div>
      <h2 className="font-display text-lg text-ink tracking-tight mt-2">
        Resumo da empresa
      </h2>
      <p className="mt-3 text-sm text-ink/70 leading-relaxed">{text}</p>
    </article>
  );
}
