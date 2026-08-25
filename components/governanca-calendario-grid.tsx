"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  eventsInMonth,
  groupEventsByDate,
  monthGrid,
  monthTitle,
  todayIso,
  WEEKDAYS,
  type ResultadoEvent,
} from "@/lib/governanca-calendario";

type Props = {
  events: ResultadoEvent[];
  year: number;
  month: number;
  selected: string | null;
  inPortfolio: Set<string>;
  onSelect: (iso: string) => void;
  onShift: (delta: number) => void;
};

/** Grade compacta à esquerda e lista do dia à direita. */
export function GovernancaCalendarioGrid({
  events,
  year,
  month,
  selected,
  inPortfolio,
  onSelect,
  onShift,
}: Props) {
  const byDate = groupEventsByDate(events);
  const cells = monthGrid(year, month);
  const monthEvents = eventsInMonth(events, year, month);
  const today = todayIso();

  return (
    <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-12">
      <div className="lg:col-span-8 p-5 overflow-y-auto scrollbar-thin">
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => onShift(-1)}
            className="h-8 w-8 grid place-items-center border border-line hover:border-brand/40"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h3 className="font-display text-base text-ink">
            {monthTitle(year, month)}
          </h3>
          <button
            type="button"
            onClick={() => onShift(1)}
            className="h-8 w-8 grid place-items-center border border-line hover:border-brand/40"
            aria-label="Próximo mês"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-auto text-[11px] text-ink/40 tabular">
            {monthEvents.length} divulgações
          </span>
        </div>

        <div className="grid grid-cols-7 border-t border-l border-line">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="border-b border-r border-line px-1.5 py-1.5 text-[10px] uppercase tracking-[0.12em] text-ink/45"
            >
              {d}
            </div>
          ))}
          {cells.map((cell) => {
            const list = byDate.get(cell.iso) ?? [];
            const isSel = selected === cell.iso;
            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => onSelect(cell.iso)}
                className={cn(
                  "min-h-[6.25rem] border-b border-r border-line px-1.5 py-1.5 text-left align-top",
                  !cell.inMonth && "bg-surface/70",
                  isSel && "bg-brand/10",
                  list.length > 0 && cell.inMonth && !isSel && "hover:bg-brand/[0.06]"
                )}
              >
                <span
                  className={cn(
                    "block text-[11px] tabular leading-none",
                    cell.iso === today && "text-brand font-medium",
                    !cell.inMonth && "text-ink/30"
                  )}
                >
                  {cell.day}
                </span>
                {list.slice(0, 3).map((e) => (
                  <span
                    key={e.id}
                    className={cn(
                      "mt-1 block text-[10px] leading-tight truncate",
                      inPortfolio.has(e.ticker)
                        ? "text-brand font-medium"
                        : "text-ink/65",
                      !cell.inMonth && "opacity-50"
                    )}
                  >
                    {e.ticker}
                  </span>
                ))}
                {list.length > 3 && (
                  <span className="mt-0.5 block text-[10px] text-ink/40">
                    +{list.length - 3}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-line p-5 overflow-y-auto scrollbar-thin">
        <h4 className="text-[10px] uppercase tracking-[0.14em] text-ink/45 mb-3">
          {selected
            ? `Divulgações em ${formatDateShort(selected)}`
            : "Neste mês"}
        </h4>
        <DayEvents
          events={selected ? (byDate.get(selected) ?? []) : monthEvents}
          inPortfolio={inPortfolio}
        />
      </aside>
    </div>
  );
}

function DayEvents({
  events,
  inPortfolio,
}: {
  events: ResultadoEvent[];
  inPortfolio: Set<string>;
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-ink/45">Nenhuma divulgação neste período.</p>
    );
  }
  return (
    <ul className="divide-y divide-line border border-line">
      {events.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between gap-3 px-3 py-2.5"
        >
          <div className="min-w-0">
            <div className="text-sm text-ink font-medium">{e.ticker}</div>
            <div className="text-xs text-ink/50 truncate">{e.name ?? "—"}</div>
          </div>
          {inPortfolio.has(e.ticker) ? (
            <Link
              href={`/governanca/${e.ticker}`}
              className="text-[10px] uppercase tracking-[0.12em] text-brand shrink-0"
            >
              Ver →
            </Link>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
