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
    key === "dyFwd" ||
    key === "qualityReturn" ||
    key === "roic_calc"
  ) {
    return `${formatNumber(v, 1)}%`;
  }
  if (key === "peFwd" || key === "evEbitda" || key === "peRatio" || key === "pbRatio") {
    return `${formatNumber(v, 1)}x`;
  }
  return formatNumber(v, 2);
}

function compactMoney(v: number): string {
  const abs = Math.abs(v);
  const body =
    abs >= 1e9
      ? `${formatNumber(v / 1e9, 1)} bi`
      : abs >= 1e6
        ? `${formatNumber(v / 1e6, 1)} mi`
        : formatNumber(v, 0);
  return v < 0 ? `(${body})` : body;
}

function taxLabel(v: number): string {
  const rounded = Math.round(v * 10) / 10;
  const digits = Number.isInteger(rounded) ? 0 : 1;
  return `${formatNumber(rounded, digits)}%`;
}

/** Conta do ROIC calculado, com os números do FY1 quando existirem. */
export function roicCalcFormulaLines(parts: {
  ebit: number | null;
  taxRate: number | null;
  equity: number | null;
  netDebt: number | null;
}): string[] {
  const lines = ["EBIT × (1 − alíquota) ÷ (patrimônio + dívida líquida)"];
  if (parts.ebit == null || parts.equity == null || parts.netDebt == null) {
    if (parts.taxRate == null) lines.push("Alíquota sem consenso: 34%.");
    return lines;
  }
  const tax = parts.taxRate ?? 34;
  lines.push(
    `${compactMoney(parts.ebit)} × (1 − ${taxLabel(tax)}) ÷ (${compactMoney(parts.equity)} + ${compactMoney(parts.netDebt)})`
  );
  if (parts.taxRate == null) lines.push("Alíquota sem consenso: 34%.");
  return lines;
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
