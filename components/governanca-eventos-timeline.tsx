"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  CATEGORIA_LABEL,
  mondayIso,
  type GovernancaEvento,
} from "@/lib/governanca-eventos";
import { empresaHref } from "@/lib/empresa";

type Props = { ticker?: string };

function eventDay(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

function relevanciaClass(v: string | null): string {
  const s = (v ?? "").toLowerCase();
  if (s === "alta") return "text-destructive";
  if (s === "média" || s === "media") return "text-amber-700";
  return "text-ink/45";
}

function EventCard({
  e,
  hideTicker,
}: {
  e: GovernancaEvento;
  hideTicker: boolean;
}) {
  const day = eventDay(e.dataEvento);
  return (
    <article
      className={cn(
        "snap-start shrink-0 w-[min(100%,18rem)] sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.67rem)]",
        "border border-line bg-surface-soft p-4 flex flex-col min-h-[11.5rem]"
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink/45">
        {day && <span className="tabular">{formatDateShort(day)}</span>}
        {!hideTicker && (
          <Link
            href={empresaHref(e.ticker)}
            className="font-medium text-ink hover:text-brand"
          >
            {e.ticker}
          </Link>
        )}
        {e.tipo && <span>{e.tipo}</span>}
        {e.categoria && (
          <span>{CATEGORIA_LABEL[e.categoria] ?? e.categoria}</span>
        )}
        {e.relevancia && (
          <span className={relevanciaClass(e.relevancia)}>{e.relevancia}</span>
        )}
      </div>
      <h3 className="mt-2 text-sm font-medium text-ink leading-snug line-clamp-2">
        {e.titulo}
      </h3>
      {e.resumo && (
        <p className="mt-1.5 text-xs text-ink/60 leading-relaxed line-clamp-4 flex-1">
          {e.resumo}
        </p>
      )}
      {e.fonteUrl && (
        <a
          href={e.fonteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-brand hover:underline"
        >
          {e.fonteNome ?? "Fonte"}
          <ArrowUpRight className="h-3 w-3" />
        </a>
      )}
    </article>
  );
}

/** Carrossel da semana corrente a partir de governanca_eventos. */
export function GovernancaEventosTimeline({ ticker }: Props) {
  const [events, setEvents] = React.useState<GovernancaEvento[] | undefined>();
  const [error, setError] = React.useState<string | null>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const hovering = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    setEvents(undefined);
    setError(null);
    const params = ticker ? `?ticker=${encodeURIComponent(ticker)}` : "";
    (async () => {
      try {
        const res = await fetch(`/api/governanca/eventos${params}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) setEvents(json as GovernancaEvento[]);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Erro ao carregar");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  function scrollPage(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    const atStart = el.scrollLeft <= 8;
    if (dir === 1 && atEnd) {
      el.scrollTo({ left: 0, behavior: "smooth" });
      return;
    }
    if (dir === -1 && atStart) {
      el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
      return;
    }
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  }

  React.useEffect(() => {
    if (!events || events.length < 2) return;
    const id = window.setInterval(() => {
      if (hovering.current) return;
      scrollPage(1);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [events]);

  if (error) {
    return (
      <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 px-4 py-3">
        {error}
      </p>
    );
  }

  if (events === undefined) return <Skeleton className="h-48 w-full" />;

  const week = mondayIso();
  const start = events[0]?.janelaInicio ?? week;
  const end = events[0]?.janelaFim ?? start;
  const showNav = events.length > 1;

  const arrowClass =
    "h-9 w-9 shrink-0 self-center inline-flex items-center justify-center border border-line bg-white text-ink hover:border-brand/40";

  return (
    <section className="border border-line bg-white p-5 sm:p-6">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.16em] text-ink/40">
          Semana · {formatDateShort(start)}
          {end !== start ? ` – ${formatDateShort(end)}` : ""}
        </div>
        <h2 className="font-display text-lg text-ink tracking-tight mt-2">
          Atualizações da semana
        </h2>
      </div>

      {events.length === 0 ? (
        <p className="mt-3 text-sm text-ink/50">
          Nenhuma atualização nesta semana
          {ticker ? ` para ${ticker}` : ""}.
        </p>
      ) : (
        <div
          className="mt-4 flex items-center gap-2"
          onMouseEnter={() => {
            hovering.current = true;
          }}
          onMouseLeave={() => {
            hovering.current = false;
          }}
        >
          {showNav && (
            <button
              type="button"
              aria-label="Anteriores"
              onClick={() => scrollPage(-1)}
              className={arrowClass}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div
            ref={scrollerRef}
            className="flex-1 min-w-0 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {events.map((e) => (
              <EventCard key={e.id} e={e} hideTicker={Boolean(ticker)} />
            ))}
          </div>
          {showNav && (
            <button
              type="button"
              aria-label="Próximas"
              onClick={() => scrollPage(1)}
              className={arrowClass}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </section>
  );
}
