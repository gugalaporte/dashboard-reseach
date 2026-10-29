"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { GovernancaCalendarioGrid } from "@/components/governanca-calendario-grid";
import {
  eventsInPortfolio,
  firstEventIsoInMonth,
  initialMonth,
  shiftMonth,
  todayIso,
  type ResultadoEvent,
} from "@/lib/governanca-calendario";
import { issuerKey } from "@/lib/governanca-portfolio";

type Props = { portfolioTickers?: string[] };

/** Botão e modal do calendário de divulgação de resultados. */
export function GovernancaCalendario({ portfolioTickers = [] }: Props) {
  const [open, setOpen] = React.useState(false);
  const [events, setEvents] = React.useState<ResultadoEvent[] | undefined>();
  const [error, setError] = React.useState<string | null>(null);
  const [cursor, setCursor] = React.useState({ year: 2026, month: 0 });
  const [selected, setSelected] = React.useState<string | null>(null);
  const tickerKey = portfolioTickers.join(",");
  const inPortfolio = React.useMemo(
    () => new Set(tickerKey.split(",").filter(Boolean).map((t) => issuerKey(t))),
    [tickerKey]
  );
  const shown = React.useMemo(
    () => (events ? eventsInPortfolio(events, portfolioTickers) : undefined),
    [events, tickerKey]
  );

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setEvents(undefined);
    setError(null);
    (async () => {
      try {
        const res = await fetch("/api/governanca/resultados", {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (cancelled) return;
        setEvents(json as ResultadoEvent[]);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Erro ao carregar");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  React.useEffect(() => {
    if (!shown) return;
    const today = todayIso();
    const start = initialMonth(shown, today);
    setCursor(start);
    setSelected(firstEventIsoInMonth(shown, start.year, start.month, today));
  }, [shown]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 px-3 border border-line bg-white text-sm text-ink hover:border-brand/40 hover:text-brand transition shrink-0"
      >
        <CalendarDays className="h-4 w-4" />
        Calendário
      </button>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent className="w-[min(96vw,72rem)] max-h-[90vh]">
          <div className="px-5 sm:px-6 pt-5 pr-12 border-b border-line shrink-0 pb-4">
            <DialogTitle className="font-display text-xl text-ink tracking-tight">
              Calendário de resultados
            </DialogTitle>
          </div>

          <div className="flex-1 min-h-0 overflow-hidden">
            {error && (
              <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3 mb-4">
                {error}
              </p>
            )}
            {shown === undefined ? (
              <Skeleton className="h-80 w-full m-5" />
            ) : (
              <GovernancaCalendarioGrid
                events={shown}
                year={cursor.year}
                month={cursor.month}
                selected={selected}
                inPortfolio={inPortfolio}
                onSelect={setSelected}
                onShift={(delta) => {
                  const next = shiftMonth(cursor.year, cursor.month, delta);
                  setCursor(next);
                  setSelected(
                    firstEventIsoInMonth(
                      shown,
                      next.year,
                      next.month,
                      todayIso()
                    )
                  );
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
