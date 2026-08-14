"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { OwnershipPie } from "@/components/ownership-pie";
import { formatDateShort, formatNumber } from "@/lib/format";
import {
  buildOwnershipSlices,
  holdersWithMinPct,
  investorTypePt,
  ownershipHeadline,
  parentView,
  type OwnershipPayload,
} from "@/lib/governanca-ownership";

type Props = { ticker: string };

function fmtPct(v: number | null): string {
  if (v == null) return "–";
  return `${formatNumber(v, 2)}%`;
}

function fmtShares(v: number | null): string {
  if (v == null) return "–";
  return formatNumber(v, 0);
}

/** Card da coluna direita: pizza da composição acionária. */
export function GovernancaOwnershipCard({ ticker }: Props) {
  const [data, setData] = React.useState<OwnershipPayload | null | undefined>(
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
          `/api/governanca/ownership?ticker=${encodeURIComponent(ticker)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) setData(json as OwnershipPayload);
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

  if (data === undefined) return <Skeleton className="h-64 w-full" />;

  const asOf = data?.asOf ? formatDateShort(data.asOf) : null;
  const slices = buildOwnershipSlices(data?.holders ?? []);
  const empty = !data || slices.length === 0;

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
          LSEG{asOf ? ` · ${asOf}` : ""}
        </div>
        <h2 className="font-display text-lg text-ink tracking-tight mt-2">
          Composição Acionária
        </h2>

        {empty ? (
          <p className="text-xs text-ink/45 mt-3">
            Sem dados de acionistas para {ticker}.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="border-l-2 border-l-brand bg-brand/10 px-3 py-2 text-[12px] font-medium text-brand">
              {ownershipHeadline(data)}
            </div>
            <div className="pointer-events-none">
              <OwnershipPie slices={slices} size={148} />
            </div>
          </div>
        )}

        <div className="mt-4 text-[10px] uppercase tracking-[0.14em] text-ink/30 group-hover:text-brand transition">
          Abrir →
        </div>
      </div>

      <OwnershipDialog
        data={data}
        ticker={ticker}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

function ParentBlock({ data }: { data: OwnershipPayload }) {
  const view = parentView(data);
  if (view.kind !== "two") return null;

  return (
    <div className="mt-6 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-ink/40">
          Controlador imediato
        </div>
        <p className="text-sm text-ink mt-1">{view.immediate}</p>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-ink/40">
          Controlador último
        </div>
        <p className="text-sm text-ink mt-1">{view.ultimate}</p>
      </div>
    </div>
  );
}

function OwnershipDialog({
  data,
  ticker,
  open,
  onClose,
}: {
  data: OwnershipPayload | null;
  ticker: string;
  open: boolean;
  onClose: () => void;
}) {
  const asOf = data?.asOf ? formatDateShort(data.asOf) : null;
  const slices = buildOwnershipSlices(data?.holders ?? []);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[min(92vw,64rem)]">
        <div className="px-5 sm:px-6 pt-5 pr-12 border-b border-line shrink-0 pb-4">
          <DialogTitle className="font-display text-xl text-ink tracking-tight">
            Composição Acionária
          </DialogTitle>
          <p className="text-sm text-ink/50 mt-1">
            {ticker}
            {asOf ? ` · posição LSEG em ${asOf}` : ""}
            {data ? ` · ${data.holders.length} acionistas` : ""}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 sm:px-6 py-5">
          {!data || slices.length === 0 ? (
            <p className="text-sm text-ink/50 py-10 text-center">
              Sem composição acionária para {ticker}.
            </p>
          ) : (
            <>
              <div className="border-l-2 border-l-brand bg-brand/10 px-3 py-2 text-sm font-medium text-brand mb-5">
                {ownershipHeadline(data)}
              </div>
              {open && <OwnershipPie slices={slices} size={220} />}
              <ParentBlock data={data} />
              <p className="text-[10px] uppercase tracking-[0.14em] text-ink/40 mb-2">
                Acionistas com pelo menos 1%
              </p>
              <HoldersTable holders={holdersWithMinPct(data.holders)} />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HoldersTable({
  holders,
}: {
  holders: OwnershipPayload["holders"];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left min-w-[36rem]">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.12em] text-ink/45">
            <th className="py-2.5 border-b border-line font-medium">Acionista</th>
            <th className="py-2.5 border-b border-line font-medium">Tipo</th>
            <th className="py-2.5 border-b border-line font-medium text-right">%</th>
            <th className="py-2.5 border-b border-line font-medium text-right">Ações</th>
            <th className="py-2.5 border-b border-line font-medium text-right">Posição</th>
          </tr>
        </thead>
        <tbody>
          {holders.map((h) => (
            <tr key={h.name} className="text-[13px]">
              <td className="py-2.5 border-b border-line text-ink/80 pr-3">{h.name}</td>
              <td className="py-2.5 border-b border-line text-ink/55 pr-3 whitespace-nowrap">
                {investorTypePt(h.type)}
              </td>
              <td className="py-2.5 border-b border-line tabular text-right">{fmtPct(h.pct)}</td>
              <td className="py-2.5 border-b border-line tabular text-right">{fmtShares(h.shares)}</td>
              <td className="py-2.5 border-b border-line text-ink/50 text-right whitespace-nowrap">
                {h.holdingsDate ? formatDateShort(h.holdingsDate) : "–"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
