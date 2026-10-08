"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { sectorPt } from "@/lib/sector-labels";
import type { FactorRow } from "@/lib/factor-scoring";
import {
  factorRankOf,
  formatFactorNominal,
  formatMetricRaw,
  formatRank,
  formatScore,
} from "@/lib/factor-display";
import type { BottomUpPayload } from "@/lib/bottom-up-types";
import { BottomUpCharts } from "@/components/bottom-up-charts";
import { BottomUpValuation } from "@/components/bottom-up-valuation";
import { BottomUpIntrinsic } from "@/components/bottom-up-intrinsic";
import { BottomUpQualitative } from "@/components/bottom-up-qualitative";

type Props = {
  row: FactorRow | null;
  onClose: () => void;
};

/** Drawer Bottom-up: snapshot + histórico + valuation + intrínseco + qualitativo. */
export function BottomUpDrawer({ row, onClose }: Props) {
  const [payload, setPayload] = React.useState<BottomUpPayload | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!row) {
      setPayload(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/factors/bottom-up?ticker=${encodeURIComponent(row.ticker)}`, {
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
  }, [row]);

  return (
    <Sheet open={!!row} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full max-w-full sm:w-[min(92vw,72rem)] sm:max-w-[min(92vw,72rem)] p-0 bg-surface-soft">
        <SheetHeader className="p-4 sm:p-6 pr-12 border-b border-line bg-surface-soft">
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink/45 font-medium">
            Bottom-up analysis
          </div>
          <SheetTitle className="font-display text-xl sm:text-2xl mt-1">
            {row?.ticker}
            {row?.name ? (
              <span className="block text-sm font-sans font-normal text-ink/50 mt-1">
                {row.name}
              </span>
            ) : null}
          </SheetTitle>
        </SheetHeader>

        {row && (
          <div className="flex-1 overflow-y-auto scrollbar-thin px-4 sm:px-6 py-4 sm:py-5">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 text-sm mb-4">
              <Meta
                label="Setor"
                value={row.sector ? sectorPt(row.sector) : "–"}
              />
              <Meta label="Classe" value={row.factorClass ?? "–"} />
              <Meta label="Score" value={formatScore(row.score)} />
            </div>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center mb-5">
              {(
                [
                  ["Quality", "quality"],
                  ["Value", "value"],
                  ["Mom.", "momentum"],
                  ["Carry", "carry"],
                  ["Liq.", "liquidity"],
                ] as const
              ).map(([label, factor]) => {
                const rank = factorRankOf(row, factor);
                return (
                  <div
                    key={label}
                    className="border border-line bg-white px-1.5 sm:px-2 py-2.5"
                  >
                    <div className="text-[9px] uppercase tracking-wide text-ink/40 truncate">
                      {label}
                    </div>
                    <div className="tabular text-xs sm:text-sm font-semibold mt-1 inline-flex items-baseline justify-center gap-0.5">
                      <span>{formatFactorNominal(row, factor)}</span>
                      {rank != null && (
                        <span className="text-[9px] text-ink/40 font-medium">
                          {formatRank(rank)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Tabs defaultValue="snapshot">
              <TabsList className="w-full overflow-x-auto flex-nowrap">
                <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="valuation">Valuation</TabsTrigger>
                <TabsTrigger value="intrinseco">Preço justo</TabsTrigger>
                <TabsTrigger value="tese">Tese</TabsTrigger>
              </TabsList>

              <TabsContent value="snapshot" className="mt-4">
                <SnapshotTab row={row} />
              </TabsContent>

              <TabsContent value="historico" className="mt-4">
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
              </TabsContent>

              <TabsContent value="valuation" className="mt-4">
                {loading ? (
                  <Skeleton className="h-40 w-full" />
                ) : error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : (
                  <BottomUpValuation
                    bands={payload?.bands ?? []}
                    peerCount={payload?.peerCount ?? 0}
                  />
                )}
              </TabsContent>

              <TabsContent value="intrinseco" className="mt-4">
                {loading ? (
                  <Skeleton className="h-40 w-full" />
                ) : error ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : payload?.intrinsic ? (
                  <BottomUpIntrinsic estimate={payload.intrinsic} />
                ) : (
                  <p className="text-sm text-ink/40">Sem estimativa.</p>
                )}
              </TabsContent>

              <TabsContent value="tese" className="mt-4">
                <BottomUpQualitative ticker={row.ticker} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SnapshotTab({ row }: { row: FactorRow }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-[0.14em] text-ink/45 mb-3">
        Breakdown das métricas
      </h3>
      {row.breakdown.length === 0 ? (
        <p className="text-sm text-ink/40">
          {row.ineligibleReason ?? "Sem métricas (inelegível)."}
        </p>
      ) : (
        <div className="border border-line bg-white overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-x-2 sm:gap-x-4 px-3 sm:px-4 py-2.5 border-b border-line bg-surface text-[9px] uppercase tracking-[0.14em] text-ink/45">
            <span>Métrica</span>
            <span className="text-right">Valor</span>
          </div>
          <ul>
            {row.breakdown.map((m) => (
              <li
                key={m.key}
                className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-x-2 sm:gap-x-4 items-center px-3 sm:px-4 py-2.5 border-b border-line/60 last:border-b-0 text-sm"
              >
                <span
                  className="text-ink/70 truncate min-w-0"
                  title={m.label}
                >
                  {m.label}
                  {m.inverted ? (
                    <span className="text-[10px] text-ink/35 ml-1">(menor é melhor)</span>
                  ) : null}
                </span>
                <span className="tabular text-ink font-medium text-xs text-right whitespace-nowrap">
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
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-white px-2.5 sm:px-3 py-2 min-w-0">
      <div className="text-[9px] uppercase tracking-wide text-ink/40">
        {label}
      </div>
      <div className="text-sm font-medium mt-0.5 truncate" title={value}>
        {value}
      </div>
    </div>
  );
}
