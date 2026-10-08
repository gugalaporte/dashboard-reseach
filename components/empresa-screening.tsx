"use client";

import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomUpCharts } from "@/components/bottom-up-charts";
import { BottomUpValuation } from "@/components/bottom-up-valuation";
import { BottomUpIntrinsic } from "@/components/bottom-up-intrinsic";
import { ClassCell, CompositeScoreCell, FactorScoreCell } from "@/components/factor-cell-tip";
import { formatMetricRaw } from "@/lib/factor-display";
import { DEFAULT_WEIGHT_PCT } from "@/lib/factor-scoring";
import type { FactorRow } from "@/lib/factor-scoring";
import type { BottomUpPayload } from "@/lib/bottom-up-types";

type Props = { ticker: string; row: FactorRow | null };

/** Screening: scores, snapshot, histórico, valuation e preço justo. */
export function EmpresaScreening({ ticker, row }: Props) {
  const [payload, setPayload] = React.useState<BottomUpPayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/factors/bottom-up?ticker=${encodeURIComponent(ticker)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const json = (await res.json()) as BottomUpPayload & { error?: string };
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
        if (!cancelled) setPayload(json);
      })
      .catch((e) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Erro ao carregar");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  return (
    <div className="space-y-8">
      {row ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
            {(
              [
                ["Quality", "quality"],
                ["Value", "value"],
                ["Momentum", "momentum"],
                ["Carry", "carry"],
                ["Score", "score"],
              ] as const
            ).map(([label, key]) => (
              <div key={label} className="border border-line bg-white px-2 py-3">
                <div className="text-[9px] uppercase tracking-wide text-ink/40">
                  {label}
                </div>
                <div className="mt-1">
                  {key === "score" ? (
                    <CompositeScoreCell row={row} weights={DEFAULT_WEIGHT_PCT} />
                  ) : (
                    <FactorScoreCell row={row} factor={key} />
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[10px] uppercase tracking-[0.14em] text-ink/45">
              Classe
            </span>
            <ClassCell row={row} />
            {!row.eligible && row.ineligibleReason ? (
              <span className="text-xs text-ink/50">{row.ineligibleReason}</span>
            ) : null}
          </div>
        </>
      ) : (
        <p className="text-sm text-ink/50 border border-line bg-white px-4 py-6 text-center">
          Sem linha de screening para este papel.
        </p>
      )}

      {row && (
        <div>
          <h3 className="text-[11px] uppercase tracking-[0.14em] text-ink/45 mb-3">
            Breakdown das métricas
          </h3>
          {row.breakdown.length === 0 ? (
            <p className="text-sm text-ink/40">
              {row.ineligibleReason ?? "Sem métricas."}
            </p>
          ) : (
            <div className="border border-line bg-white overflow-hidden">
              <ul>
                {row.breakdown.map((m) => (
                  <li
                    key={m.key}
                    className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-x-4 items-center px-4 py-2.5 border-b border-line/60 last:border-b-0 text-sm"
                  >
                    <span className="text-ink/70 truncate">{m.label}</span>
                    <span className="tabular text-ink font-medium text-xs text-right">
                      {m.factor === "value" && m.raw != null && m.raw <= 0
                        ? "ignorado"
                        : formatMetricRaw(m.key, m.raw)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-[11px] uppercase tracking-[0.14em] text-ink/45 mb-3">
          Histórico
        </h3>
        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <BottomUpCharts
            series={payload?.series ?? []}
            annual={payload?.annual ?? []}
            fiscal={payload?.fiscal ?? []}
          />
        )}
      </div>

      <div>
        <h3 className="text-[11px] uppercase tracking-[0.14em] text-ink/45 mb-3">
          Valuation
        </h3>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <BottomUpValuation
            bands={payload?.bands ?? []}
            peerCount={payload?.peerCount ?? 0}
          />
        )}
      </div>

      <div>
        <h3 className="text-[11px] uppercase tracking-[0.14em] text-ink/45 mb-3">
          Preço justo
        </h3>
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : payload?.intrinsic ? (
          <BottomUpIntrinsic estimate={payload.intrinsic} />
        ) : (
          <p className="text-sm text-ink/40">Sem estimativa.</p>
        )}
      </div>
    </div>
  );
}
