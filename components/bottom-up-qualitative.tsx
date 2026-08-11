"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  loadBottomUpNotes,
  saveBottomUpNotes,
} from "@/lib/bottom-up-storage";
import {
  PIPELINE_STEPS,
  type BottomUpNotes,
  type PipelineStatus,
} from "@/lib/bottom-up-types";
import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/format";

type Props = { ticker: string };

/** Pipeline + notas qualitativas (tese, moat, governança). */
export function BottomUpQualitative({ ticker }: Props) {
  const [notes, setNotes] = React.useState<BottomUpNotes | null>(null);
  const [draft, setDraft] = React.useState({
    thesis: "",
    moat: "",
    governance: "",
  });
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    const n = loadBottomUpNotes(ticker);
    setNotes(n);
    setDraft({
      thesis: n.thesis,
      moat: n.moat,
      governance: n.governance,
    });
    setSaved(false);
  }, [ticker]);

  const setStatus = (status: PipelineStatus) => {
    const next = saveBottomUpNotes(ticker, { status });
    setNotes(next);
  };

  const handleSave = () => {
    const next = saveBottomUpNotes(ticker, draft);
    setNotes(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  if (!notes) return null;

  const stepIdx = PIPELINE_STEPS.findIndex((s) => s.id === notes.status);

  return (
    <div className="space-y-5">
      <div>
        <h4 className="text-[10px] uppercase tracking-[0.14em] text-ink/45 mb-3">
          Pipeline
        </h4>
        <div className="flex flex-wrap gap-1">
          {PIPELINE_STEPS.map((step, i) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setStatus(step.id)}
              className={cn(
                "px-2.5 h-8 text-[10px] uppercase tracking-[0.08em] font-medium border transition",
                i <= stepIdx
                  ? "bg-navy text-surface-soft border-navy"
                  : "bg-white text-ink/50 border-line hover:border-ink/30"
              )}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>

      <Field
        label="Tese de investimento"
        value={draft.thesis}
        onChange={(thesis) => setDraft((d) => ({ ...d, thesis }))}
        rows={4}
        placeholder="Por que este papel? Quais drivers de upside?"
      />
      <Field
        label="Moat / vantagem competitiva"
        value={draft.moat}
        onChange={(moat) => setDraft((d) => ({ ...d, moat }))}
        rows={3}
        placeholder="Barreiras de entrada, escala, marca, switching costs…"
      />
      <Field
        label="Governança e gestão"
        value={draft.governance}
        onChange={(governance) => setDraft((d) => ({ ...d, governance }))}
        rows={3}
        placeholder="Alinhamento, capital allocation, histórico de gestão…"
      />

      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] text-ink/35">
          {notes.updatedAt
            ? `Salvo ${formatDateShort(notes.updatedAt)} · local neste browser`
            : "Ainda não salvo · fica neste browser"}
        </span>
        <Button
          type="button"
          size="sm"
          className="h-8 text-[11px] uppercase tracking-[0.08em]"
          onClick={handleSave}
        >
          {saved ? "Salvo" : "Salvar notas"}
        </Button>
      </div>
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
