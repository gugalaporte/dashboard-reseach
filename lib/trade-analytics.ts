export type DailyBar = {
  ric: string;
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  typicalPrice: number;
};

export function barOnDate(bars: DailyBar[], isoDate: string): DailyBar | null {
  let best: DailyBar | null = null;
  for (const b of bars) {
    if (b.tradeDate <= isoDate && (!best || b.tradeDate > best.tradeDate)) {
      best = b;
    }
  }
  return best;
}

export function latestBar(bars: DailyBar[]): DailyBar | null {
  if (bars.length === 0) return null;
  return bars[bars.length - 1];
}

export type MovAtivoRow = {
  id: number;
  trade_date: string;
  product: string;
  amount: string;
  price: string;
  productclass: string;
  book: string;
  trader: string;
  financialsettle: string;
  trading_desk: string;
};

export type TradeSide = "buy" | "sell";

export type DayExecution = {
  ric: string;
  tradeDateIso: string;
  tradingDesk: string;
  side: TradeSide;
  qty: number;
  avgPrice: number;
  notional: number;
  tradeCount: number;
  book: string;
  trader: string;
  marketClose: number | null;
  marketTypical: number | null;
  /** bps: positivo = execução melhor que referência */
  vsCloseBps: number | null;
  vsTypicalBps: number | null;
  /** R$: positivo = ganho vs referência (compra abaixo / venda acima) */
  vsCloseValue: number | null;
  vsTypicalValue: number | null;
  quality: "good" | "neutral" | "poor" | "unknown";
};

export type RotationPair = {
  tradeDateIso: string;
  tradingDesk: string;
  shortLeg: string;
  longLeg: string;
  shortAvg: number;
  longAvg: number;
  shortNotional: number;
  longNotional: number;
  book: string;
};

export type PairPerformance = {
  pairId: string;
  tradeDateIso: string;
  tradingDesk: string;
  shortLeg: string;
  longLeg: string;
  /** Retorno sintético do par (long - short), em % */
  pairReturnPct: number | null;
  longReturnPct: number | null;
  shortReturnPct: number | null;
  ibovReturnPct: number | null;
  /** pairReturn - ibovReturn */
  alphaVsIbovPct: number | null;
  asOfDate: string | null;
};

const IBOV_RIC = "^BVSP";

/** MM/DD/YYYY → yyyy-mm-dd */
export function parseMovTradeDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const mm = m[1].padStart(2, "0");
  const dd = m[2].padStart(2, "0");
  return `${m[3]}-${mm}-${dd}`;
}

function num(v: string | number): number {
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function isEquityTrade(row: MovAtivoRow): boolean {
  if (row.productclass !== "Equity") return false;
  const p = row.product.toUpperCase();
  if (p.includes("DIVIDEND") || p.includes("NAV_") || p.includes("SPLIT")) return false;
  return /^[A-Z]{4}\d{1,2}$/.test(p);
}

/** Agrega fills do dia por papel e lado. */
export function aggregateExecutions(rows: MovAtivoRow[]): Omit<DayExecution, "marketClose" | "marketTypical" | "vsCloseBps" | "vsTypicalBps" | "quality">[] {
  const map = new Map<string, {
    ric: string;
    tradeDateIso: string;
    tradingDesk: string;
    side: TradeSide;
    qty: number;
    notional: number;
    tradeCount: number;
    book: string;
    trader: string;
  }>();

  for (const row of rows) {
    if (!isEquityTrade(row)) continue;
    const iso = parseMovTradeDate(row.trade_date);
    if (!iso) continue;

    const amount = num(row.amount);
    if (amount === 0) continue;
    const side: TradeSide = amount > 0 ? "buy" : "sell";
    const qty = Math.abs(amount);
    const px = num(row.price);
    if (px <= 0) continue;

    const desk = row.trading_desk?.trim() || "—";
    const key = `${iso}|${row.product}|${side}|${desk}`;
    const cur = map.get(key) ?? {
      ric: row.product.toUpperCase(),
      tradeDateIso: iso,
      tradingDesk: desk,
      side,
      qty: 0,
      notional: 0,
      tradeCount: 0,
      book: row.book,
      trader: row.trader,
    };
    cur.qty += qty;
    cur.notional += qty * px;
    cur.tradeCount += 1;
    map.set(key, cur);
  }

  return [...map.values()].map((x) => ({
    ...x,
    avgPrice: x.qty > 0 ? x.notional / x.qty : 0,
  }));
}

function executionBps(side: TradeSide, avg: number, ref: number): number {
  if (ref <= 0 || avg <= 0) return 0;
  // Compra abaixo = bom (+); venda acima = bom (+)
  return side === "buy"
    ? ((ref - avg) / ref) * 10_000
    : ((avg - ref) / ref) * 10_000;
}

/** Valor financeiro ganho/perdido vs preço de referência. */
export function executionValue(
  side: TradeSide,
  avg: number,
  ref: number,
  qty: number
): number {
  if (ref <= 0 || avg <= 0 || qty <= 0) return 0;
  return side === "buy" ? (ref - avg) * qty : (avg - ref) * qty;
}

function classifyQuality(bps: number | null): DayExecution["quality"] {
  if (bps == null) return "unknown";
  if (bps >= 5) return "good";
  if (bps <= -5) return "poor";
  return "neutral";
}

export function enrichExecutions(
  base: ReturnType<typeof aggregateExecutions>,
  barsByRic: Map<string, DailyBar[]>
): DayExecution[] {
  return base.map((ex) => {
    const bars = barsByRic.get(ex.ric) ?? [];
    const bar = barOnDate(bars, ex.tradeDateIso);
    const close = bar?.close ?? null;
    const typical = bar?.typicalPrice ?? null;

    const vsCloseBps = close != null ? executionBps(ex.side, ex.avgPrice, close) : null;
    const vsTypicalBps = typical != null ? executionBps(ex.side, ex.avgPrice, typical) : null;
    const vsCloseValue =
      close != null ? executionValue(ex.side, ex.avgPrice, close, ex.qty) : null;
    const vsTypicalValue =
      typical != null ? executionValue(ex.side, ex.avgPrice, typical, ex.qty) : null;
    const refBps = vsTypicalBps ?? vsCloseBps;

    return {
      ...ex,
      marketClose: close,
      marketTypical: typical,
      vsCloseBps,
      vsTypicalBps,
      vsCloseValue,
      vsTypicalValue,
      quality: classifyQuality(refBps),
    };
  });
}

/** Uma rotação por dia e desk (venda/compra padrão pelo maior volume). */
export function detectRotationPairs(executions: DayExecution[]): RotationPair[] {
  const byDay = new Map<string, { buys: DayExecution[]; sells: DayExecution[] }>();

  for (const ex of executions) {
    const bucketKey = rotationBucketKey(ex.tradeDateIso, ex.tradingDesk);
    const bucket = byDay.get(bucketKey) ?? { buys: [], sells: [] };
    if (ex.side === "buy") bucket.buys.push(ex);
    else bucket.sells.push(ex);
    byDay.set(bucketKey, bucket);
  }

  const pairs: RotationPair[] = [];

  for (const [bucketKey, { buys, sells }] of byDay) {
    if (buys.length === 0 || sells.length === 0) continue;
    const tradeDateIso = bucketKey.split("|")[0]!;
    const tradingDesk = buys[0]?.tradingDesk ?? sells[0]?.tradingDesk ?? "—";

    const sell = [...sells].sort((a, b) => b.notional - a.notional)[0]!;

    let best: DayExecution | null = null;
    let bestDiff = Infinity;
    for (const buy of buys) {
      const diff = Math.abs(buy.notional - sell.notional);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = buy;
      }
    }

    if (!best) continue;

    pairs.push({
      tradeDateIso,
      tradingDesk,
      shortLeg: sell.ric,
      longLeg: best.ric,
      shortAvg: sell.avgPrice,
      longAvg: best.avgPrice,
      shortNotional: sell.notional,
      longNotional: best.notional,
      book: sell.book === best.book ? sell.book : `${sell.book} / ${best.book}`,
    });
  }

  return pairs.sort((a, b) => b.tradeDateIso.localeCompare(a.tradeDateIso));
}

function returnPct(from: number, to: number): number | null {
  if (from <= 0 || to <= 0) return null;
  return ((to / from) - 1) * 100;
}

function syntheticShortReturn(entry: number, current: number): number | null {
  return returnPct(current, entry);
}

export function computePairPerformances(
  pairs: RotationPair[],
  barsByRic: Map<string, DailyBar[]>,
  ibovBars: DailyBar[]
): PairPerformance[] {
  const ibovLatest = latestBar(ibovBars);

  return pairs.map((p) => {
    const longBars = barsByRic.get(p.longLeg) ?? [];
    const shortBars = barsByRic.get(p.shortLeg) ?? [];
    const longEntry = barOnDate(longBars, p.tradeDateIso);
    const shortEntry = barOnDate(shortBars, p.tradeDateIso);
    const longNow = latestBar(longBars);
    const shortNow = latestBar(shortBars);

    const longFrom = longEntry?.close ?? p.longAvg;
    const shortFrom = shortEntry?.close ?? p.shortAvg;
    const longTo = longNow?.close ?? null;
    const shortTo = shortNow?.close ?? null;

    const longReturnPct = longTo != null ? returnPct(longFrom, longTo) : null;
    const shortReturnPct =
      shortTo != null ? syntheticShortReturn(shortFrom, shortTo) : null;

    let pairReturnPct: number | null = null;
    if (longReturnPct != null && shortReturnPct != null) {
      const wLong = p.longNotional / (p.longNotional + p.shortNotional);
      const wShort = 1 - wLong;
      pairReturnPct = wLong * longReturnPct + wShort * shortReturnPct;
    }

    const ibovEntry = barOnDate(ibovBars, p.tradeDateIso);
    const ibovReturnPct =
      ibovEntry && ibovLatest
        ? returnPct(ibovEntry.close, ibovLatest.close)
        : null;

    const alphaVsIbovPct =
      pairReturnPct != null && ibovReturnPct != null
        ? pairReturnPct - ibovReturnPct
        : null;

    return {
      pairId: `${p.tradeDateIso}|${p.tradingDesk}`,
      tradeDateIso: p.tradeDateIso,
      tradingDesk: p.tradingDesk,
      shortLeg: p.shortLeg,
      longLeg: p.longLeg,
      pairReturnPct,
      longReturnPct,
      shortReturnPct,
      ibovReturnPct,
      alphaVsIbovPct,
      asOfDate: longNow?.tradeDate ?? shortNow?.tradeDate ?? ibovLatest?.tradeDate ?? null,
    };
  });
}

export type RotationLegOption = {
  ric: string;
  notional: number;
  returnPct: number | null;
};

export type RotationRow = PairPerformance & {
  sellOptions: RotationLegOption[];
  buyOptions: RotationLegOption[];
};

function rotationBucketKey(tradeDateIso: string, tradingDesk: string): string {
  return `${tradeDateIso}|${tradingDesk}`;
}

function groupRotationBuckets(
  executions: DayExecution[]
): Map<string, { buys: DayExecution[]; sells: DayExecution[] }> {
  const map = new Map<string, { buys: DayExecution[]; sells: DayExecution[] }>();

  for (const ex of executions) {
    const key = rotationBucketKey(ex.tradeDateIso, ex.tradingDesk);
    const bucket = map.get(key) ?? { buys: [], sells: [] };
    if (ex.side === "buy") bucket.buys.push(ex);
    else bucket.sells.push(ex);
    map.set(key, bucket);
  }

  return map;
}

function executionReturnPct(
  ex: DayExecution,
  barsByRic: Map<string, DailyBar[]>
): number | null {
  const bars = barsByRic.get(ex.ric) ?? [];
  const entry = barOnDate(bars, ex.tradeDateIso);
  const now = latestBar(bars);
  const from = entry?.close ?? ex.avgPrice;
  const to = now?.close ?? null;
  if (to == null) return null;
  return ex.side === "buy" ? returnPct(from, to) : syntheticShortReturn(from, to);
}

function toLegOptions(
  execs: DayExecution[],
  barsByRic: Map<string, DailyBar[]>
): RotationLegOption[] {
  return execs
    .map((ex) => ({
      ric: ex.ric,
      notional: ex.notional,
      returnPct: executionReturnPct(ex, barsByRic),
    }))
    .sort((a, b) => b.notional - a.notional);
}

/** Linhas de rotação com opções de venda/compra do mesmo dia e desk. */
export function buildRotationRows(
  executions: DayExecution[],
  barsByRic: Map<string, DailyBar[]>,
  ibovBars: DailyBar[]
): RotationRow[] {
  const pairs = detectRotationPairs(executions);
  const performances = computePairPerformances(pairs, barsByRic, ibovBars);
  const buckets = groupRotationBuckets(executions);

  return performances.map((perf, i) => {
    const pair = pairs[i]!;
    const bucket =
      buckets.get(rotationBucketKey(pair.tradeDateIso, pair.tradingDesk)) ?? {
        buys: [],
        sells: [],
      };

    return {
      ...perf,
      sellOptions: toLegOptions(bucket.sells, barsByRic),
      buyOptions: toLegOptions(bucket.buys, barsByRic),
    };
  });
}

/** Recalcula retornos ao trocar venda/compra na UI. */
export function recomputeRotationPair(
  row: RotationRow,
  shortLeg: string,
  longLeg: string
): Pick<
  PairPerformance,
  "shortLeg" | "longLeg" | "longReturnPct" | "shortReturnPct" | "pairReturnPct" | "alphaVsIbovPct"
> {
  const short = row.sellOptions.find((o) => o.ric === shortLeg);
  const long = row.buyOptions.find((o) => o.ric === longLeg);

  const longReturnPct = long?.returnPct ?? null;
  const shortReturnPct = short?.returnPct ?? null;

  let pairReturnPct: number | null = null;
  if (long && short && longReturnPct != null && shortReturnPct != null) {
    const wLong = long.notional / (long.notional + short.notional);
    pairReturnPct = wLong * longReturnPct + (1 - wLong) * shortReturnPct;
  }

  const alphaVsIbovPct =
    pairReturnPct != null && row.ibovReturnPct != null
      ? pairReturnPct - row.ibovReturnPct
      : null;

  return {
    shortLeg,
    longLeg,
    longReturnPct,
    shortReturnPct,
    pairReturnPct,
    alphaVsIbovPct,
  };
}

export function summaryStats(executions: DayExecution[]) {
  const withRef = executions.filter((e) => e.vsTypicalBps != null || e.vsCloseBps != null);
  const bps = withRef.map((e) => e.vsTypicalBps ?? e.vsCloseBps ?? 0);
  const good = executions.filter((e) => e.quality === "good").length;
  const poor = executions.filter((e) => e.quality === "poor").length;

  let buyNotional = 0;
  let sellNotional = 0;
  let totalVsTypicalValue = 0;
  let scoredValueCount = 0;

  for (const ex of executions) {
    if (ex.side === "buy") buyNotional += ex.notional;
    else sellNotional += ex.notional;
    if (ex.vsTypicalValue != null) {
      totalVsTypicalValue += ex.vsTypicalValue;
      scoredValueCount += 1;
    }
  }

  return {
    total: executions.length,
    scored: withRef.length,
    good,
    poor,
    neutral: executions.filter((e) => e.quality === "neutral").length,
    avgBps: bps.length ? bps.reduce((a, b) => a + b, 0) / bps.length : null,
    buyNotional,
    sellNotional,
    totalVsTypicalValue: scoredValueCount > 0 ? totalVsTypicalValue : null,
  };
}

export { IBOV_RIC };
