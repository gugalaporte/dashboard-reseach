import { formatNumber } from "./format";
import type { FactorId, FactorRow, MetricBreakdown } from "./factor-scoring";

export function factorRankOf(row: FactorRow, factor: FactorId): number | null {
  if (factor === "quality") return row.qualityRank;
  if (factor === "value") return row.valueRank;
  if (factor === "momentum") return row.momentumRank;
  if (factor === "carry") return row.carryRank;
  return null;
}

export function formatRank(rank: number | null | undefined): string {
  if (rank == null) return "";
  return `${rank}º`;
}

export function formatMetricRaw(key: string, v: number | null): string {
  if (v == null) return "–";
  if (key === "marketCap" || key === "dayVolume") {
    const abs = Math.abs(v);
    if (abs >= 1e9) return `${formatNumber(v / 1e9, 2)} bi`;
    if (abs >= 1e6) return `${formatNumber(v / 1e6, 1)} mi`;
    return formatNumber(v, 0);
  }
  if (
    key === "revenueCagr" ||
    key === "roe" ||
    key === "roic" ||
    key === "ret3m" ||
    key === "dividendYield" ||
    key === "dyFwd"
  ) {
    return `${formatNumber(v, 1)}%`;
  }
  if (key === "peFwd" || key === "evEbitda" || key === "peRatio" || key === "pbRatio") {
    return `${formatNumber(v, 1)}x`;
  }
  return formatNumber(v, 2);
}

function valueBreakdown(row: FactorRow): MetricBreakdown | undefined {
  return row.breakdown.find((m) => m.factor === "value");
}

/** Valor nominal do fator (sem ranking). */
export function formatFactorNominal(row: FactorRow, factor: FactorId): string {
  const v = row[factor];
  if (v == null) return "–";
  if (factor === "value") {
    const key = valueBreakdown(row)?.key ?? "evEbitda";
    return formatMetricRaw(key, v);
  }
  if (factor === "liquidity") return formatNumber(v, 2);
  return `${formatNumber(v, 1)}%`;
}

export function formatFactorCell(row: FactorRow, factor: FactorId): string {
  const nom = formatFactorNominal(row, factor);
  const rank = formatRank(factorRankOf(row, factor));
  if (nom === "–" || !rank) return nom;
  return `${nom} ${rank}`;
}

export function formatScore(v: number | null | undefined): string {
  if (v == null) return "–";
  return formatNumber(v, 1);
}
