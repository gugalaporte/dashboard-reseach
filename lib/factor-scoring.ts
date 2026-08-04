/** Scoring multifatorial (z-score por setor) — read-only, puro. */

export type FactorClass = "A" | "B" | "C";

export type FactorEligibility = {
  minDayVolume: number;
  maxNetDebtEbitda: number;
};

export const DEFAULT_ELIGIBILITY: FactorEligibility = {
  minDayVolume: 20_000,
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

/** Inputs por empresa após join snapshot + forward + companies. */
export type FactorInput = {
  ticker: string;
  ric: string;
  name: string | null;
  sector: string | null;
  asOfDate: string | null;
  roe: number | null;
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
    "Média dos z-scores no setor: ROE, margem EBITDA, dívida líquida/EBITDA (inv., menor é melhor).",
  value:
    "Média dos z-scores no setor: P/E fwd ou P/E (inv., menor é melhor), P/B (inv.), EV/EBITDA (inv.), upside %.",
  momentum:
    "Média dos z-scores no setor: revisão EPS 4 semanas %, retorno 3M, retorno 6M.",
  carry:
    "Z-score no setor: DY fwd ou dividend yield.",
  liquidity:
    "Média dos z-scores no setor: market cap, volume diário.",
};

export type FactorRow = {
  ticker: string;
  ric: string;
  name: string | null;
  sector: string | null;
  asOfDate: string | null;
  quality: number | null;
  value: number | null;
  momentum: number | null;
  carry: number | null;
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

/** Z-score; null se valor ausente ou desvio zero no setor. */
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
  if (vol == null || vol < cfg.minDayVolume) {
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

type MetricDef = {
  key: keyof FactorInput;
  label: string;
  inverted?: boolean;
};

function collectPeers(
  rows: FactorInput[],
  key: keyof FactorInput
): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (const r of rows) {
    const sector = r.sector?.trim() || "Sem setor";
    const v = r[key];
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const list = map.get(sector) ?? [];
    list.push(v);
    map.set(sector, list);
  }
  return map;
}

function metricZ(
  row: FactorInput,
  key: keyof FactorInput,
  peersBySector: Map<string, number[]>,
  inverted: boolean
): number | null {
  const sector = row.sector?.trim() || "Sem setor";
  const peers = peersBySector.get(sector) ?? [];
  const raw = row[key];
  const z = typeof raw === "number" ? zScore(raw, peers) : null;
  if (z == null) return null;
  return inverted ? -z : z;
}

/** Value: pe_fwd invertido se existir, senão pe_ratio invertido. */
function valuePeZ(row: FactorInput, pePeers: Map<string, number[]>, peFwdPeers: Map<string, number[]>): {
  z: number | null;
  key: string;
  label: string;
  raw: number | null;
  inverted: boolean;
} {
  if (row.peFwd != null) {
    return {
      z: metricZ(row, "peFwd", peFwdPeers, true),
      key: "peFwd",
      label: "P/E fwd",
      raw: row.peFwd,
      inverted: true,
    };
  }
  return {
    z: metricZ(row, "peRatio", pePeers, true),
    key: "peRatio",
    label: "P/E",
    raw: row.peRatio,
    inverted: true,
  };
}

/** Carry: dy_fwd se existir, senão dividend_yield. */
function carryYieldZ(row: FactorInput, dyPeers: Map<string, number[]>, dyFwdPeers: Map<string, number[]>): {
  z: number | null;
  key: string;
  label: string;
  raw: number | null;
  inverted: boolean;
} {
  if (row.dyFwd != null) {
    return {
      z: metricZ(row, "dyFwd", dyFwdPeers, false),
      key: "dyFwd",
      label: "DY fwd",
      raw: row.dyFwd,
      inverted: false,
    };
  }
  return {
    z: metricZ(row, "dividendYield", dyPeers, false),
    key: "dividendYield",
    label: "Dividend yield",
    raw: row.dividendYield,
    inverted: false,
  };
}

const QUALITY_METRICS: MetricDef[] = [
  { key: "roe", label: "ROE" },
  { key: "ebitdaMargin", label: "Margem EBITDA" },
  { key: "netDebtEbitda", label: "Dívida líquida/EBITDA", inverted: true },
];

const VALUE_EXTRA: MetricDef[] = [
  { key: "pbRatio", label: "P/B", inverted: true },
  { key: "evEbitda", label: "EV/EBITDA", inverted: true },
  { key: "upsidePct", label: "Upside %" },
];

const MOMENTUM_METRICS: MetricDef[] = [
  { key: "epsRev4wPct", label: "Rev. EPS 4s %" },
  { key: "ret3m", label: "Retorno 3M" },
  { key: "ret6m", label: "Retorno 6M" },
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
 * Calcula z-scores por setor, fatores e score composto.
 * Só empresas elegíveis entram na normalização e no ranking de classe.
 */
export function scoreFactors(
  inputs: FactorInput[],
  cfg: FactorEligibility = DEFAULT_ELIGIBILITY
): FactorRow[] {
  const eligible = inputs.filter((r) => isEligible(r, cfg).ok);

  const peerMaps: Record<string, Map<string, number[]>> = {
    roe: collectPeers(eligible, "roe"),
    ebitdaMargin: collectPeers(eligible, "ebitdaMargin"),
    netDebtEbitda: collectPeers(eligible, "netDebtEbitda"),
    peRatio: collectPeers(eligible, "peRatio"),
    peFwd: collectPeers(eligible, "peFwd"),
    pbRatio: collectPeers(eligible, "pbRatio"),
    evEbitda: collectPeers(eligible, "evEbitda"),
    upsidePct: collectPeers(eligible, "upsidePct"),
    epsRev4wPct: collectPeers(eligible, "epsRev4wPct"),
    ret3m: collectPeers(eligible, "ret3m"),
    ret6m: collectPeers(eligible, "ret6m"),
    dividendYield: collectPeers(eligible, "dividendYield"),
    dyFwd: collectPeers(eligible, "dyFwd"),
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
        value: null,
        momentum: null,
        carry: null,
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

    const breakdown: MetricBreakdown[] = [];
    const qualityZs: Array<number | null> = [];
    for (const m of QUALITY_METRICS) {
      const z = metricZ(row, m.key, peerMaps[m.key]!, !!m.inverted);
      qualityZs.push(z);
      breakdown.push({
        key: m.key,
        label: m.label,
        raw: typeof row[m.key] === "number" ? (row[m.key] as number) : null,
        z,
        inverted: !!m.inverted,
        factor: "quality",
      });
    }

    const pePart = valuePeZ(row, peerMaps.peRatio!, peerMaps.peFwd!);
    breakdown.push({
      key: pePart.key,
      label: pePart.label,
      raw: pePart.raw,
      z: pePart.z,
      inverted: pePart.inverted,
      factor: "value",
    });
    const valueZs: Array<number | null> = [pePart.z];
    for (const m of VALUE_EXTRA) {
      const z = metricZ(row, m.key, peerMaps[m.key]!, !!m.inverted);
      valueZs.push(z);
      breakdown.push({
        key: m.key,
        label: m.label,
        raw: typeof row[m.key] === "number" ? (row[m.key] as number) : null,
        z,
        inverted: !!m.inverted,
        factor: "value",
      });
    }

    const momentumZs: Array<number | null> = [];
    for (const m of MOMENTUM_METRICS) {
      const z = metricZ(row, m.key, peerMaps[m.key]!, false);
      momentumZs.push(z);
      breakdown.push({
        key: m.key,
        label: m.label,
        raw: typeof row[m.key] === "number" ? (row[m.key] as number) : null,
        z,
        inverted: false,
        factor: "momentum",
      });
    }

    const carryPart = carryYieldZ(row, peerMaps.dividendYield!, peerMaps.dyFwd!);
    breakdown.push({
      key: carryPart.key,
      label: carryPart.label,
      raw: carryPart.raw,
      z: carryPart.z,
      inverted: false,
      factor: "carry",
    });

    const liquidityZs: Array<number | null> = [];
    for (const m of LIQUIDITY_METRICS) {
      const z = metricZ(row, m.key, peerMaps[m.key]!, false);
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

    const quality = avgNullable(qualityZs);
    const value = avgNullable(valueZs);
    const momentum = avgNullable(momentumZs);
    const carry = avgNullable([carryPart.z]);
    const liquidity = avgNullable(liquidityZs);

    const parts: Array<{ w: number; v: number | null }> = [
      { w: FACTOR_WEIGHTS.quality, v: quality },
      { w: FACTOR_WEIGHTS.value, v: value },
      { w: FACTOR_WEIGHTS.momentum, v: momentum },
      { w: FACTOR_WEIGHTS.carry, v: carry },
      { w: FACTOR_WEIGHTS.liquidity, v: liquidity },
    ];
    const present = parts.filter((p) => p.v != null && p.w > 0);
    let score: number | null = null;
    if (present.length > 0) {
      const wSum = present.reduce((a, p) => a + p.w, 0);
      score = present.reduce((a, p) => a + (p.v! * p.w) / wSum, 0);
    }

    return {
      ticker: row.ticker,
      ric: row.ric,
      name: row.name,
      sector: row.sector,
      asOfDate: row.asOfDate,
      quality,
      value,
      momentum,
      carry,
      liquidity,
      score,
      percentile: null,
      factorClass: null,
      eligible: true,
      inPortfolio: Boolean(row.inPortfolio),
      breakdown,
      raw: row,
    };
  });

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
