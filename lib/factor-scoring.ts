/** Scoring multifatorial (valor nominal + ranking no universo da tela). */

import { finacapBook } from "./finacap-book";

export type FactorClass = "A" | "B" | "C";

export type FactorEligibility = {
  minDayVolume: number;
  maxNetDebtEbitda: number;
};

export const DEFAULT_ELIGIBILITY: FactorEligibility = {
  minDayVolume: 1_000_000,
  maxNetDebtEbitda: 8,
};

export const FACTOR_WEIGHTS = {
  quality: 0.3,
  value: 0.3,
  momentum: 0.1,
  carry: 0.3,
  /** Fora do score composto (peso 0); ainda calculado para breakdown. */
  liquidity: 0,
} as const;

export type FactorWeights = {
  quality: number;
  value: number;
  momentum: number;
  carry: number;
  liquidity: number;
};

/** Pesos na UI (0–100). O composto renormaliza se a soma ≠ 100. */
export type FactorWeightPct = {
  quality: number;
  value: number;
  carry: number;
  momentum: number;
};

export const DEFAULT_WEIGHT_PCT: FactorWeightPct = {
  quality: 30,
  value: 30,
  carry: 30,
  momentum: 10,
};

export function sanitizeWeightPct(
  raw: Partial<Record<keyof FactorWeightPct, number>>
): FactorWeightPct {
  const n = (v: number | undefined, fallback: number) => {
    if (v == null || !Number.isFinite(v) || v < 0) return fallback;
    return Math.min(100, v);
  };
  const pct: FactorWeightPct = {
    quality: n(raw.quality, DEFAULT_WEIGHT_PCT.quality),
    value: n(raw.value, DEFAULT_WEIGHT_PCT.value),
    carry: n(raw.carry, DEFAULT_WEIGHT_PCT.carry),
    momentum: n(raw.momentum, DEFAULT_WEIGHT_PCT.momentum),
  };
  if (pct.quality + pct.value + pct.carry + pct.momentum <= 0) {
    return { ...DEFAULT_WEIGHT_PCT };
  }
  return pct;
}

export function weightsFromPct(pct: FactorWeightPct): FactorWeights {
  return {
    quality: pct.quality / 100,
    value: pct.value / 100,
    carry: pct.carry / 100,
    momentum: pct.momentum / 100,
    liquidity: 0,
  };
}

/** Inputs por empresa após join snapshot + forward + companies. */
export type FactorInput = {
  ticker: string;
  ric: string;
  name: string | null;
  sector: string | null;
  asOfDate: string | null;
  roe: number | null;
  roic: number | null;
  netMargin: number | null;
  ebitdaMargin: number | null;
  currentRatio: number | null;
  netDebtEbitda: number | null;
  peRatio: number | null;
  peFwd: number | null;
  pbRatio: number | null;
  evEbitda: number | null;
  upsidePct: number | null;
  epsRev4wPct: number | null;
  ret3m: number | null;
  ret6m: number | null;
  dividendYield: number | null;
  dyFwd: number | null;
  marketCap: number | null;
  dayVolume: number | null;
  analystCount: number | null;
  /** Crescimento composto da receita em 2 anos (3 exercícios anuais), em %. */
  revenueCagr: number | null;
  /** Flag companies.in_portfolio (carteira Finacap). */
  inPortfolio: boolean;
};

export type FactorId = "quality" | "value" | "momentum" | "carry" | "liquidity";

export type MetricBreakdown = {
  key: string;
  label: string;
  raw: number | null;
  z: number | null;
  inverted: boolean;
  factor: FactorId;
};

export const FACTOR_LABELS: Record<FactorId, string> = {
  quality: "Quality",
  value: "Value",
  momentum: "Momentum",
  carry: "Carry",
  liquidity: "Liquidez",
};

/** Descrição genérica da composição de cada fator (para tooltip). */
export const FACTOR_FORMULA: Record<FactorId, string> = {
  quality:
    "Bancos e financeiras: ROE. Demais: ROIC. Mais a evolução da receita (crescimento composto em 2 anos, 3 exercícios anuais fechados). Quality = média dessas 2 métricas. Ranking 1º = maior valor no universo da tela.",
  value:
    "Bancos e financeiras: P/E fwd (menor é melhor), só entre financeiras na tela. Demais: EV/EBITDA (menor é melhor), só entre não-financeiras. Múltiplo ≤ 0 é ignorado. Ranking 1º = mais barato no grupo.",
  momentum:
    "Retorno 3M. Ranking 1º = maior retorno no universo da tela.",
  carry:
    "DY fwd ou dividend yield. Ranking 1º = maior yield no universo da tela.",
  liquidity:
    "Média dos z-scores no universo da tela: market cap, volume diário.",
};

export type FactorRow = {
  ticker: string;
  ric: string;
  name: string | null;
  sector: string | null;
  asOfDate: string | null;
  quality: number | null;
  qualityRank: number | null;
  value: number | null;
  valueRank: number | null;
  momentum: number | null;
  momentumRank: number | null;
  carry: number | null;
  carryRank: number | null;
  liquidity: number | null;
  score: number | null;
  percentile: number | null;
  factorClass: FactorClass | null;
  eligible: boolean;
  ineligibleReason?: string;
  inPortfolio: boolean;
  breakdown: MetricBreakdown[];
  raw: FactorInput;
};

function mean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function std(vals: number[], m: number): number {
  if (vals.length < 2) return 0;
  const v = vals.reduce((acc, x) => acc + (x - m) ** 2, 0) / vals.length;
  return Math.sqrt(v);
}

/** Z-score; null se valor ausente. Um par só → 0. */
export function zScore(value: number | null, peers: number[]): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (peers.length < 2) return 0;
  const m = mean(peers);
  const s = std(peers, m);
  if (s === 0) return 0;
  return (value - m) / s;
}

function avgNullable(vals: Array<number | null>): number | null {
  const ok = vals.filter((v): v is number => v != null && Number.isFinite(v));
  if (ok.length === 0) return null;
  return mean(ok);
}

export function isEligible(
  row: FactorInput,
  cfg: FactorEligibility
): { ok: boolean; reason?: string } {
  const vol = row.dayVolume;
  // Carteira Finacap sempre passa no volume — o piso não as descarta.
  if (!row.inPortfolio && (vol == null || vol < cfg.minDayVolume)) {
    return { ok: false, reason: `Volume < ${cfg.minDayVolume}` };
  }
  const analysts = row.analystCount ?? 0;
  if (analysts <= 0) {
    return { ok: false, reason: "Sem cobertura de analistas" };
  }
  // Bancos/financeiras: ND/EBITDA não é comparável — não corta elegibilidade.
  if (!isLeverageExemptSector(row.sector)) {
    const nd = row.netDebtEbitda;
    if (nd != null && nd > cfg.maxNetDebtEbitda) {
      return { ok: false, reason: `Dívida/EBITDA > ${cfg.maxNetDebtEbitda}` };
    }
  }
  return { ok: true };
}

/** Setores em que ND/EBITDA é pouco informativo (bancos/financeiras). */
export function isLeverageExemptSector(sector: string | null | undefined): boolean {
  const s = (sector ?? "").toLowerCase();
  return /bank|banco|financ|insurance|seguro|invest/.test(s);
}

/** Value: P/E fwd só em banco/financeira; EV/EBITDA no restante. */
export function isFinancialForValue(row: {
  ticker: string;
  sector: string | null | undefined;
}): boolean {
  if (finacapBook(row.ticker) === "Financials") return true;
  return isLeverageExemptSector(row.sector);
}

type MetricDef = {
  key: keyof FactorInput;
  label: string;
  inverted?: boolean;
};

/** P/E, P/B e EV/EBITDA ≤ 0 não são múltiplos de valuation. */
const VALUE_POSITIVE_KEYS: ReadonlySet<keyof FactorInput> = new Set([
  "peRatio",
  "peFwd",
  "pbRatio",
  "evEbitda",
]);

function usableMetric(key: keyof FactorInput, v: unknown): v is number {
  if (typeof v !== "number" || !Number.isFinite(v)) return false;
  if (VALUE_POSITIVE_KEYS.has(key) && v <= 0) return false;
  return true;
}

function collectPeers(rows: FactorInput[], key: keyof FactorInput): number[] {
  const list: number[] = [];
  for (const r of rows) {
    const v = r[key];
    if (usableMetric(key, v)) list.push(v);
  }
  return list;
}

function metricZ(
  row: FactorInput,
  key: keyof FactorInput,
  peers: number[],
  inverted: boolean
): number | null {
  const raw = row[key];
  if (!usableMetric(key, raw)) return null;
  const z = zScore(raw, peers);
  if (z == null) return null;
  return inverted ? -z : z;
}

/** Rank 1 = melhor. Empate compartilha a posição; a próxima pula (1, 2, 2, 4). */
export function assignRanks(
  items: Array<{ ticker: string; value: number | null }>,
  inverted: boolean
): Map<string, number> {
  const present = items.filter(
    (x): x is { ticker: string; value: number } =>
      x.value != null && Number.isFinite(x.value)
  );
  present.sort((a, b) => (inverted ? a.value - b.value : b.value - a.value));
  const out = new Map<string, number>();
  let lastVal: number | undefined;
  let lastRank = 0;
  for (let i = 0; i < present.length; i++) {
    const cur = present[i]!;
    if (lastVal === undefined || cur.value !== lastVal) {
      lastRank = i + 1;
      lastVal = cur.value;
    }
    out.set(cur.ticker, lastRank);
  }
  return out;
}

/** 1 = melhor do grupo, 0 = pior. Usado só no score composto. */
function rankScore(rank: number | null, count: number): number | null {
  if (rank == null || count <= 0) return null;
  if (count === 1) return 1;
  return 1 - (rank - 1) / (count - 1);
}

/** Value: P/E fwd (financeiras) ou EV/EBITDA (demais). */
function valueMetric(row: FactorInput): MetricBreakdown {
  if (isFinancialForValue(row)) {
    return {
      key: "peFwd",
      label: "P/E fwd",
      raw: row.peFwd,
      z: null,
      inverted: true,
      factor: "value",
    };
  }
  return {
    key: "evEbitda",
    label: "EV/EBITDA",
    raw: row.evEbitda,
    z: null,
    inverted: true,
    factor: "value",
  };
}

function valueNominal(row: FactorInput): number | null {
  if (isFinancialForValue(row)) {
    return usableMetric("peFwd", row.peFwd) ? row.peFwd : null;
  }
  return usableMetric("evEbitda", row.evEbitda) ? row.evEbitda : null;
}

/** Quality: ROE (financeiras) ou ROIC (demais). */
function qualityReturnMetric(row: FactorInput): MetricBreakdown {
  if (isFinancialForValue(row)) {
    return {
      key: "roe",
      label: "ROE",
      raw: row.roe,
      z: null,
      inverted: false,
      factor: "quality",
    };
  }
  return {
    key: "roic",
    label: "ROIC",
    raw: row.roic,
    z: null,
    inverted: false,
    factor: "quality",
  };
}

function qualityGrowthMetric(row: FactorInput): MetricBreakdown {
  return {
    key: "revenueCagr",
    label: "Evolução da receita",
    raw: row.revenueCagr,
    z: null,
    inverted: false,
    factor: "quality",
  };
}

function carryYield(row: FactorInput): {
  key: string;
  label: string;
  raw: number | null;
} {
  if (row.dyFwd != null && Number.isFinite(row.dyFwd)) {
    return { key: "dyFwd", label: "DY fwd", raw: row.dyFwd };
  }
  return {
    key: "dividendYield",
    label: "Dividend yield",
    raw:
      row.dividendYield != null && Number.isFinite(row.dividendYield)
        ? row.dividendYield
        : null,
  };
}

const MOMENTUM_METRICS: MetricDef[] = [
  { key: "ret3m", label: "Retorno 3M" },
];

const LIQUIDITY_METRICS: MetricDef[] = [
  { key: "marketCap", label: "Market cap" },
  { key: "dayVolume", label: "Volume diário" },
];

/** Percentil 0–100 (maior score = percentil mais alto). */
export function percentileRank(scores: number[], value: number): number {
  if (scores.length === 0) return 0;
  const below = scores.filter((s) => s < value).length;
  const equal = scores.filter((s) => s === value).length;
  return ((below + 0.5 * equal) / scores.length) * 100;
}

export function classifyByPercentile(p: number): FactorClass {
  if (p >= 75) return "A";
  if (p >= 25) return "B";
  return "C";
}

/**
 * Valor nominal + ranking no universo da tela.
 * Só empresas elegíveis entram no ranking e na classe.
 */
export function scoreFactors(
  inputs: FactorInput[],
  cfg: FactorEligibility = DEFAULT_ELIGIBILITY,
  weights: FactorWeights = FACTOR_WEIGHTS
): FactorRow[] {
  const eligible = inputs.filter((r) => isEligible(r, cfg).ok);
  const liqPeers: Record<string, number[]> = {
    marketCap: collectPeers(eligible, "marketCap"),
    dayVolume: collectPeers(eligible, "dayVolume"),
  };

  const scored: FactorRow[] = inputs.map((row) => {
    const elig = isEligible(row, cfg);
    if (!elig.ok) {
      return {
        ticker: row.ticker,
        ric: row.ric,
        name: row.name,
        sector: row.sector,
        asOfDate: row.asOfDate,
        quality: null,
        qualityRank: null,
        value: null,
        valueRank: null,
        momentum: null,
        momentumRank: null,
        carry: null,
        carryRank: null,
        liquidity: null,
        score: null,
        percentile: null,
        factorClass: null,
        eligible: false,
        ineligibleReason: elig.reason,
        inPortfolio: Boolean(row.inPortfolio),
        breakdown: [],
        raw: row,
      };
    }

    const returnPart = qualityReturnMetric(row);
    const growthPart = qualityGrowthMetric(row);
    const valuePart = valueMetric(row);
    const carryPart = carryYield(row);
    const quality = avgNullable([
      usableMetric(returnPart.key as keyof FactorInput, returnPart.raw)
        ? returnPart.raw
        : null,
      usableMetric("revenueCagr", growthPart.raw) ? growthPart.raw : null,
    ]);
    const value = valueNominal(row);
    const momentum =
      typeof row.ret3m === "number" && Number.isFinite(row.ret3m) ? row.ret3m : null;
    const carry = carryPart.raw;

    const breakdown: MetricBreakdown[] = [returnPart, growthPart, valuePart];
    for (const m of MOMENTUM_METRICS) {
      breakdown.push({
        key: m.key,
        label: m.label,
        raw: typeof row[m.key] === "number" ? (row[m.key] as number) : null,
        z: null,
        inverted: false,
        factor: "momentum",
      });
    }
    breakdown.push({
      key: carryPart.key,
      label: carryPart.label,
      raw: carryPart.raw,
      z: null,
      inverted: false,
      factor: "carry",
    });

    const liquidityZs: Array<number | null> = [];
    for (const m of LIQUIDITY_METRICS) {
      const z = metricZ(row, m.key, liqPeers[m.key]!, false);
      liquidityZs.push(z);
      breakdown.push({
        key: m.key,
        label: m.label,
        raw: typeof row[m.key] === "number" ? (row[m.key] as number) : null,
        z,
        inverted: false,
        factor: "liquidity",
      });
    }

    return {
      ticker: row.ticker,
      ric: row.ric,
      name: row.name,
      sector: row.sector,
      asOfDate: row.asOfDate,
      quality,
      qualityRank: null,
      value,
      valueRank: null,
      momentum,
      momentumRank: null,
      carry,
      carryRank: null,
      liquidity: avgNullable(liquidityZs),
      score: null,
      percentile: null,
      factorClass: null,
      eligible: true,
      inPortfolio: Boolean(row.inPortfolio),
      breakdown,
      raw: row,
    };
  });

  const ok = scored.filter((r) => r.eligible);
  const qualityRanks = assignRanks(
    ok.map((r) => ({ ticker: r.ticker, value: r.quality })),
    false
  );
  const momentumRanks = assignRanks(
    ok.map((r) => ({ ticker: r.ticker, value: r.momentum })),
    false
  );
  const carryRanks = assignRanks(
    ok.map((r) => ({ ticker: r.ticker, value: r.carry })),
    false
  );
  const finRanks = assignRanks(
    ok.filter((r) => isFinancialForValue(r.raw)).map((r) => ({ ticker: r.ticker, value: r.value })),
    true
  );
  const othRanks = assignRanks(
    ok.filter((r) => !isFinancialForValue(r.raw)).map((r) => ({ ticker: r.ticker, value: r.value })),
    true
  );

  const qCount = qualityRanks.size;
  const mCount = momentumRanks.size;
  const cCount = carryRanks.size;
  const finCount = finRanks.size;
  const othCount = othRanks.size;

  for (const row of scored) {
    if (!row.eligible) continue;
    row.qualityRank = qualityRanks.get(row.ticker) ?? null;
    row.momentumRank = momentumRanks.get(row.ticker) ?? null;
    row.carryRank = carryRanks.get(row.ticker) ?? null;
    const fin = isFinancialForValue(row.raw);
    row.valueRank = (fin ? finRanks : othRanks).get(row.ticker) ?? null;
    const valueCount = fin ? finCount : othCount;

    const parts: Array<{ w: number; v: number | null }> = [
      { w: weights.quality, v: rankScore(row.qualityRank, qCount) },
      { w: weights.value, v: rankScore(row.valueRank, valueCount) },
      { w: weights.momentum, v: rankScore(row.momentumRank, mCount) },
      { w: weights.carry, v: rankScore(row.carryRank, cCount) },
    ];
    const present = parts.filter((p) => p.v != null && p.w > 0);
    if (present.length > 0) {
      const wSum = present.reduce((a, p) => a + p.w, 0);
      row.score = present.reduce((a, p) => a + (p.v! * p.w) / wSum, 0) * 100;
    }
  }

  const eligibleScores = scored
    .filter((r) => r.eligible && r.score != null)
    .map((r) => r.score!);

  for (const row of scored) {
    if (!row.eligible || row.score == null) continue;
    row.percentile = percentileRank(eligibleScores, row.score);
    row.factorClass = classifyByPercentile(row.percentile);
  }

  return scored.sort((a, b) => {
    if (a.score == null && b.score == null) return a.ticker.localeCompare(b.ticker);
    if (a.score == null) return 1;
    if (b.score == null) return -1;
    return b.score - a.score;
  });
}
