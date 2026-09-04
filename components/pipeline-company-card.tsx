"use client";

import { CompanyLogo } from "@/components/company-logo";
import { NOTES_RATINGS, type NotesRating } from "@/lib/bottom-up-types";
import type { PipelineNote } from "@/lib/pipeline";
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

/** Card de uma empresa no pipeline, com rating, target e notas. */
export function PipelineCompanyCard({ note }: { note: PipelineNote }) {
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
        <div className="flex flex-col items-end gap-1 shrink-0">
          {note.rating ? (
            <span
              className={cn(
                "px-2 h-6 inline-flex items-center text-[10px] uppercase tracking-[0.1em] font-medium",
                RATING_CLASS[note.rating]
              )}
            >
              {ratingLabel(note.rating)}
            </span>
          ) : (
            <span className="text-[10px] uppercase tracking-[0.1em] text-ink/35">
              Sem rating
            </span>
          )}
          <span className="font-mono text-sm tabular text-ink">
            {note.targetPrice == null
              ? "—"
              : formatValue(note.targetPrice, "money")}
          </span>
        </div>
      </header>

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
