"use client";

import { CompanyLogo } from "@/components/company-logo";
import { NOTES_RATINGS, type NotesRating } from "@/lib/bottom-up-types";
import { finacapUpside, type PipelineNote } from "@/lib/pipeline";
import type { LivePrice } from "@/lib/use-live-prices";
import { formatDateShort, formatValue } from "@/lib/format";
import { sectorPt } from "@/lib/sector-labels";
import { cn } from "@/lib/utils";

const RATING_CLASS: Record<NotesRating, string> = {
  buy: "bg-emerald-700 text-white",
  neutral: "bg-ink/70 text-white",
  sell: "bg-red-700 text-white",
};

function ratingLabel(id: NotesRating): string {
  return NOTES_RATINGS.find((r) => r.id === id)?.label ?? id;
}

function closeSubtitle(q: LivePrice): string {
  if (q.isPreviousSessionClose) return "últ. dia útil";
  return `fech. ${formatDateShort(q.asOf)}`;
}

function NoteBlock({ label, text }: { label: string; text: string }) {
  const empty = !text.trim();
  return (
    <div className="min-w-0">
      <h5 className="text-[10px] uppercase tracking-[0.14em] text-ink/45 mb-1.5">
        {label}
      </h5>
      <p
        className={cn(
          "text-sm leading-relaxed whitespace-pre-wrap",
          empty ? "text-ink/30" : "text-ink/80"
        )}
      >
        {empty ? "—" : text}
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-[0.14em] text-ink/45">
        {label}
      </div>
      <div className={cn("font-mono text-sm tabular mt-0.5", valueClass)}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-ink/40 mt-0.5 tabular">{sub}</div>
      )}
    </div>
  );
}

type Props = {
  note: PipelineNote;
  close?: LivePrice;
};

/** Card de uma empresa no pipeline, com fechamento, TP Finacap e upside. */
export function PipelineCompanyCard({ note, close }: Props) {
  const lastClose = close?.price ?? null;
  const upside = finacapUpside(lastClose, note.targetPrice);
  const ccy = close?.currency === "BRL" || !close ? "R$" : close.currency;

  return (
    <article className="border border-line bg-white p-4 md:p-5 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CompanyLogo ticker={note.ticker} />
          <div className="min-w-0">
            <div className="font-medium text-ink text-sm truncate">
              {note.ticker}
            </div>
            <div className="text-xs text-ink/50 truncate">
              {note.name ?? "—"}
              {note.sector ? ` · ${sectorPt(note.sector)}` : ""}
            </div>
          </div>
        </div>
        {note.rating ? (
          <span
            className={cn(
              "px-2 h-6 inline-flex items-center text-[10px] uppercase tracking-[0.1em] font-medium shrink-0",
              RATING_CLASS[note.rating]
            )}
          >
            {ratingLabel(note.rating)}
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.1em] text-ink/35 shrink-0">
            Sem rating
          </span>
        )}
      </header>

      <div className="grid grid-cols-3 gap-3 border-t border-line pt-3">
        <Stat
          label="Últ. fechamento"
          value={
            lastClose == null ? "—" : formatValue(lastClose, "money", ccy)
          }
          sub={close ? closeSubtitle(close) : undefined}
        />
        <Stat
          label="TP Finacap"
          value={
            note.targetPrice == null
              ? "—"
              : formatValue(note.targetPrice, "money")
          }
        />
        <Stat
          label="Upside"
          value={
            upside == null
              ? "—"
              : `${upside >= 0 ? "+" : ""}${upside.toFixed(1)}%`
          }
          valueClass={
            upside == null
              ? undefined
              : upside >= 0
                ? "text-emerald-700"
                : "text-red-700"
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <NoteBlock label="Tese" text={note.thesis} />
        <NoteBlock label="Principais riscos" text={note.risk} />
        <NoteBlock label="Governança" text={note.governance} />
      </div>

      {note.updatedAt && (
        <p className="text-[10px] text-ink/35">
          Atualizado {formatDateShort(note.updatedAt)}
        </p>
      )}
    </article>
  );
}
