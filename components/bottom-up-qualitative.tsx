"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  fetchBottomUpNotes,
  persistBottomUpNotes,
} from "@/lib/bottom-up-notes-client";
import { parseTargetPrice } from "@/lib/bottom-up-notes";
import {
  NOTES_RATINGS,
  PIPELINE_STEPS,
  type BottomUpNotes,
  type NotesRating,
  type PipelineStatus,
} from "@/lib/bottom-up-types";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/format";

type Props = { ticker: string };

type Draft = {
  thesis: string;
  risk: string;
  governance: string;
  targetPrice: string;
};

const EMPTY_DRAFT: Draft = {
  thesis: "",
  risk: "",
  governance: "",
  targetPrice: "",
};

function draftFrom(n: BottomUpNotes): Draft {
  return {
    thesis: n.thesis,
    risk: n.risk,
    governance: n.governance,
    targetPrice: n.targetPrice == null ? "" : String(n.targetPrice),
  };
}

/** Pipeline + rating + notas qualitativas no banco Research. */
export function BottomUpQualitative({ ticker }: Props) {
  const [notes, setNotes] = React.useState<BottomUpNotes | null>(null);
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [saved, setSaved] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setNotes(null);
    setError(null);
    setSaved(false);
    fetchBottomUpNotes(ticker)
      .then((n) => {
        if (cancelled) return;
        setNotes(n);
        setDraft(draftFrom(n));
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao carregar notas");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const persist = async (patch: Parameters<typeof persistBottomUpNotes>[1]) => {
    setBusy(true);
    setError(null);
    try {
      const next = await persistBottomUpNotes(ticker, patch);
      setNotes(next);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (status: PipelineStatus) => {
    void persist({ status: notes?.status === status ? null : status });
  };

  const setRating = (rating: NotesRating) => {
    void persist({ rating: notes?.rating === rating ? null : rating });
  };

  const handleSave = async () => {
    const targetPrice =
      draft.targetPrice.trim() === ""
        ? null
        : parseTargetPrice(draft.targetPrice);
    if (draft.targetPrice.trim() !== "" && targetPrice == null) {
      setError("Target Price inválido");
      return;
    }
    const next = await persist({
      thesis: draft.thesis,
      risk: draft.risk,
      governance: draft.governance,
      targetPrice,
    });
    if (!next) return;
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  if (error && !notes) {
    return <p className="text-xs text-destructive">{error}</p>;
  }
  if (!notes) {
    return <p className="text-[11px] text-ink/40">Carregando notas…</p>;
  }

  return (
    <div className="space-y-5">
      <ChoiceRow label="Pipeline">
        {PIPELINE_STEPS.map((step) => {
          const active = notes.status === step.id;
          return (
            <button
              key={step.id}
              type="button"
              disabled={busy}
              onClick={() => setStatus(step.id)}
              className={cn(
                "px-2.5 h-8 text-[10px] uppercase tracking-[0.08em] font-medium border transition",
                active
                  ? "bg-navy text-surface-soft border-navy"
                  : "bg-white text-ink/50 border-line hover:border-ink/30"
              )}
            >
              {step.label}
            </button>
          );
        })}
      </ChoiceRow>

      <ChoiceRow label="Rating">
        {NOTES_RATINGS.map((r) => {
          const active = notes.rating === r.id;
          return (
            <button
              key={r.id}
              type="button"
              disabled={busy}
              onClick={() => setRating(r.id)}
              className={cn(
                "px-2.5 h-8 text-[10px] uppercase tracking-[0.08em] font-medium border transition",
                active && r.id === "buy" && "bg-emerald-700 text-white border-emerald-700",
                active && r.id === "neutral" && "bg-ink/70 text-white border-ink/70",
                active && r.id === "sell" && "bg-red-700 text-white border-red-700",
                !active && "bg-white text-ink/50 border-line hover:border-ink/30"
              )}
            >
              {r.label}
            </button>
          );
        })}
      </ChoiceRow>

      <label className="block space-y-1.5">
        <span className="text-[10px] uppercase tracking-[0.14em] text-ink/45">
          Target Price
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={draft.targetPrice}
          onChange={(e) =>
            setDraft((d) => ({ ...d, targetPrice: e.target.value }))
          }
          placeholder="Ex.: 12,50"
          className="w-full border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-1 focus:ring-brand/40"
        />
      </label>

      <Field
        label="Tese de investimento"
        value={draft.thesis}
        onChange={(thesis) => setDraft((d) => ({ ...d, thesis }))}
        rows={4}
        placeholder="Por que este papel? Quais drivers de upside?"
      />
      <Field
        label="Principais riscos"
        value={draft.risk}
        onChange={(risk) => setDraft((d) => ({ ...d, risk }))}
        rows={3}
        placeholder="O que pode dar errado? Quais riscos de downside?"
      />
      <Field
        label="Governança e gestão"
        value={draft.governance}
        onChange={(governance) => setDraft((d) => ({ ...d, governance }))}
        rows={3}
        placeholder="Alinhamento, capital allocation, histórico de gestão…"
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] text-ink/35">
          {notes.updatedAt
            ? `Salvo ${formatDateShort(notes.updatedAt)} no banco`
            : "Ainda não salvo no banco"}
        </span>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          className="h-8 text-[11px] uppercase tracking-[0.08em]"
          onClick={handleSave}
        >
          {saved ? "Salvo" : busy ? "Salvando…" : "Salvar notas"}
        </Button>
      </div>
    </div>
  );
}

function ChoiceRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-[0.14em] text-ink/45 mb-3">
        {label}
      </h4>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  placeholder: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] uppercase tracking-[0.14em] text-ink/45">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-y min-h-[4.5rem] border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-1 focus:ring-brand/40"
      />
    </label>
  );
}
