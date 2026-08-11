"use client";

import type { MultipleBand } from "@/lib/bottom-up-types";
import { formatNumber } from "@/lib/format";

function BandBar({ band }: { band: MultipleBand }) {
  const { min, avg, max, current, peerMedian } = band;
  if (min == null || max == null || max <= min) {
    return (
      <p className="text-xs text-ink/40 py-2">
        Histórico insuficiente para banda de {band.label}.
      </p>
    );
  }

  const span = max - min;
  const pct = (v: number | null) =>
    v == null ? null : Math.min(100, Math.max(0, ((v - min) / span) * 100));

  const curPct = pct(current);
  const avgPct = pct(avg);
  const peerPct = pct(peerMedian);

  return (
    <div className="space-y-3">
      <div className="relative h-3 rounded-sm bg-surface border border-line">
        {/* faixa min→max */}
        <div className="absolute inset-y-0 left-0 right-0 bg-brand/10 rounded-sm" />
        {avgPct != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-ink/30"
            style={{ left: `${avgPct}%` }}
            title={`Média ${formatNumber(avg, 2)}`}
          />
        )}
        {peerPct != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-600/70"
            style={{ left: `${peerPct}%` }}
            title={`Setor ${formatNumber(peerMedian, 2)}`}
          />
        )}
        {curPct != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-brand border-2 border-white shadow"
            style={{ left: `calc(${curPct}% - 7px)` }}
            title={`Atual ${formatNumber(current, 2)}`}
          />
        )}
      </div>
      <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
        <Stat label="Mín" value={min} />
        <Stat label="Média" value={avg} />
        <Stat label="Atual" value={current} highlight />
        <Stat label="Máx" value={max} />
        <Stat label="Setor" value={peerMedian} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | null;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="uppercase tracking-wide text-ink/40">{label}</div>
      <div
        className={
          highlight
            ? "tabular font-semibold text-brand text-xs mt-0.5"
            : "tabular text-ink/70 text-xs mt-0.5"
        }
      >
        {value == null ? "–" : formatNumber(value, 2)}
      </div>
    </div>
  );
}

type Props = { bands: MultipleBand[]; peerCount: number };

/** Comparação de múltiplos vs história e pares. */
export function BottomUpValuation({ bands, peerCount }: Props) {
  return (
    <div className="space-y-5">
      <p className="text-xs text-ink/45 leading-relaxed">
        Banda histórica do próprio papel (mín / média / máx) e mediana do
        setor{peerCount > 0 ? ` (${peerCount} pares)` : ""}. Atual abaixo da
        média sugere margem de segurança relativa.
      </p>
      {bands.map((b) => (
        <div key={b.key} className="border border-line bg-white p-3 sm:p-4">
          <h4 className="text-[10px] uppercase tracking-[0.14em] text-ink/50 mb-3">
            {b.label}
          </h4>
          <BandBar band={b} />
        </div>
      ))}
      <div className="flex items-center gap-4 text-[10px] text-ink/40">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" /> Atual
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-0.5 bg-ink/30" /> Média própria
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-0.5 bg-amber-600/70" /> Mediana setor
        </span>
      </div>
    </div>
  );
}
