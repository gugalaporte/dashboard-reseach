"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { GovernancaBoardDialog } from "@/components/governanca-board-dialog";
import { hasBoardData, type CeoAnalise } from "@/lib/ceo-analise";
import { boardHeadline } from "@/lib/governanca-board";

type Props = { ticker: string };

/** Card compacto com tamanho do conselho; abre o detalhe dos membros. */
export function GovernancaBoardCard({ ticker }: Props) {
  const [data, setData] = React.useState<CeoAnalise | null | undefined>(
    undefined
  );
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

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

  if (data === undefined) return <Skeleton className="h-44 w-full" />;

  const empty = !data || !hasBoardData(data);
  const fiscalCount = data?.hasFiscalCouncil
    ? (data.fiscalCouncilMemberCount ?? 0)
    : 0;
  const headline = data
    ? boardHeadline(data.boardMemberCount ?? 0, fiscalCount)
    : null;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="w-full border border-line bg-white p-5 text-left hover:border-brand/40 hover:shadow-sm transition group cursor-pointer"
      >
        <div className="text-[10px] uppercase tracking-[0.16em] text-ink/40">
          Estrutura
        </div>
        <h2 className="font-display text-lg text-ink tracking-tight mt-2">
          Membros do Conselho
        </h2>

        {empty ? (
          <p className="text-xs text-ink/45 mt-3">
            Sem dados de conselho para {ticker}.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {headline && (
              <div className="border-l-2 border-l-brand bg-brand/10 px-3 py-2 text-[12px] font-medium text-brand">
                {headline}
              </div>
            )}
            <div className="flex items-stretch">
              <Stat
                value={formatCount(data.boardMemberCount)}
                label="Conselho"
              />
              <div className="w-px bg-line mx-4 self-stretch" />
              <Stat value={fiscalValue(data)} label="Conselho fiscal" />
            </div>
          </div>
        )}

        <div className="mt-4 text-[10px] uppercase tracking-[0.14em] text-ink/30 group-hover:text-brand transition">
          Abrir →
        </div>
      </div>

      <GovernancaBoardDialog
        ticker={ticker}
        panorama={data?.boardPanorama ?? null}
        boardMemberCount={data?.boardMemberCount ?? null}
        fiscalCouncilMemberCount={fiscalCount}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function fiscalValue(data: CeoAnalise): string {
  if (data.hasFiscalCouncil === false) return "Não";
  if (data.hasFiscalCouncil === true) {
    return formatCount(data.fiscalCouncilMemberCount);
  }
  return "–";
}

function formatCount(n: number | null): string {
  if (n == null) return "–";
  return String(n);
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="tabular font-display text-3xl text-ink leading-none">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.12em] text-ink/45 mt-1.5">
        {label}
      </div>
    </div>
  );
}
