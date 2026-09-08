export type MarketPoint = { date: string; value: number };

export type MarketInst = {
  ric: string;
  name: string;
  group_code: string;
  quote_type: string;
  currency: string;
  curve_id: string | null;
  tenor: string | null;
  enabled: boolean;
  notes: string | null;
};

export type MarketPrice = {
  ric: string;
  trade_date: string;
  value: number | null;
};

export type MarketRow = {
  ric: string;
  name: string;
  group: string;
  quoteType: string;
  currency: string;
  enabled: boolean;
  notes: string | null;
  /** Índice que o ETF rastreia, quando houver. */
  tracks: string | null;
  last: number | null;
  lastDate: string | null;
  ret1d: number | null;
  ret1w: number | null;
  ret1m: number | null;
};

export type CurveTenor = {
  tenor: string;
  label: string;
  months: number;
  now: number | null;
  weekAgo: number | null;
  monthAgo: number | null;
};

export type CurveBoard = {
  id: string;
  label: string;
  points: CurveTenor[];
};

export type MarketPayload = {
  asOf: string | null;
  rows: MarketRow[];
  series: Record<string, MarketPoint[]>;
  curves: CurveBoard[];
};

export const CURVE_LABELS: Record<string, string> = {
  BRBMK: "PRE",
  BRLPRE: "DI zero",
  BRNTNB: "NTN-B",
  UST: "Treasury",
};

const NAME_PT: Record<string, string> = {
  Acucar: "Açúcar",
  Cafe: "Café",
  "Minerio de ferro 62%": "Minério de ferro 62%",
  "Petroleo Brent": "Petróleo Brent",
  "Petroleo WTI": "Petróleo WTI",
  "Dolar USD/BRL": "Dólar USD/BRL",
};

export function displayName(name: string): string {
  return NAME_PT[name] ?? name;
}

/** ETF B3 → índice Anbima que o fundo rastreia. */
const ETF_TRACKS: Record<string, string> = {
  "B5P211=SA": "IMA-B 5",
  "IMAB11=SA": "IMA-B",
  "B5MB11=SA": "IMA-B 5+",
  "IRFM11=SA": "IRF-M",
  B5P211: "IMA-B 5",
  IMAB11: "IMA-B",
  B5MB11: "IMA-B 5+",
  IRFM11: "IRF-M",
};

export function trackedIndex(ric: string, name: string): string | null {
  return ETF_TRACKS[ric] ?? ETF_TRACKS[name] ?? null;
}

/** 1Y3M → 15; 10Y → 120; 3M → 3. */
export function tenorMonths(tenor: string): number {
  const y = tenor.match(/(\d+)\s*Y/i);
  const m = tenor.match(/(\d+)\s*M/i);
  const years = y ? Number(y[1]) : 0;
  const months = m ? Number(m[1]) : 0;
  if (!years && !months) return 0;
  return years * 12 + months;
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function sortPoints(points: MarketPoint[]): MarketPoint[] {
  return [...points].sort((a, b) => a.date.localeCompare(b.date));
}

export function valueOnOrBefore(
  points: MarketPoint[],
  date: string
): number | null {
  let found: number | null = null;
  for (const p of points) {
    if (p.date <= date) found = p.value;
  }
  return found;
}

export function lastPoint(points: MarketPoint[]): MarketPoint | null {
  const s = sortPoints(points);
  return s.at(-1) ?? null;
}

export function dayReturn(points: MarketPoint[]): number | null {
  const s = sortPoints(points);
  if (s.length < 2) return null;
  const a = s[s.length - 2]!;
  const b = s[s.length - 1]!;
  if (a.value === 0) return null;
  return (b.value / a.value - 1) * 100;
}

export function periodReturn(
  points: MarketPoint[],
  lookbackDays: number
): number | null {
  const s = sortPoints(points);
  const last = s.at(-1);
  if (!last || s.length < 2) return null;
  const target = addDays(last.date, -lookbackDays);
  const prev = valueOnOrBefore(s, target);
  if (prev == null || prev === 0) return null;
  return (last.value / prev - 1) * 100;
}

export function sliceLastDays(
  points: MarketPoint[],
  days: number
): MarketPoint[] {
  const s = sortPoints(points);
  const last = s.at(-1);
  if (!last) return [];
  const from = addDays(last.date, -days);
  return s.filter((p) => p.date >= from);
}

export function indexTo100(points: MarketPoint[]): MarketPoint[] {
  const first = points.find((p) => p.value !== 0);
  if (!first) return points.map((p) => ({ ...p }));
  return points.map((p) => ({
    date: p.date,
    value: (p.value / first.value) * 100,
  }));
}

function byRic(prices: MarketPrice[]): Map<string, MarketPoint[]> {
  const map = new Map<string, MarketPoint[]>();
  for (const p of prices) {
    if (p.value == null || !Number.isFinite(p.value)) continue;
    const list = map.get(p.ric) ?? [];
    list.push({ date: p.trade_date.slice(0, 10), value: p.value });
    map.set(p.ric, list);
  }
  for (const [k, list] of map) map.set(k, sortPoints(list));
  return map;
}

function toRow(inst: MarketInst, series: MarketPoint[]): MarketRow {
  const last = lastPoint(series);
  const canRet =
    inst.enabled &&
    inst.quote_type !== "yield_pct" &&
    inst.quote_type !== "acc_return_pct";
  return {
    ric: inst.ric,
    name: displayName(inst.name),
    group: inst.group_code,
    quoteType: inst.quote_type,
    currency: inst.currency,
    enabled: inst.enabled,
    notes: inst.notes,
    tracks: trackedIndex(inst.ric, inst.name),
    last: last?.value ?? null,
    lastDate: last?.date ?? null,
    ret1d: canRet ? dayReturn(series) : null,
    ret1w: canRet ? periodReturn(series, 7) : null,
    ret1m: canRet ? periodReturn(series, 30) : null,
  };
}

function buildCurves(
  instruments: MarketInst[],
  prices: Map<string, MarketPoint[]>,
  asOf: string | null
): CurveBoard[] {
  if (!asOf) return [];
  const week = addDays(asOf, -7);
  const month = addDays(asOf, -30);
  const byCurve = new Map<string, MarketInst[]>();
  for (const inst of instruments) {
    if (!inst.curve_id || !inst.tenor) continue;
    const list = byCurve.get(inst.curve_id) ?? [];
    list.push(inst);
    byCurve.set(inst.curve_id, list);
  }
  const boards: CurveBoard[] = [];
  for (const [id, insts] of byCurve) {
    const points: CurveTenor[] = insts
      .map((inst) => {
        const s = prices.get(inst.ric) ?? [];
        return {
          tenor: inst.tenor ?? "",
          label: displayName(inst.name),
          months: tenorMonths(inst.tenor ?? ""),
          now: valueOnOrBefore(s, asOf),
          weekAgo: valueOnOrBefore(s, week),
          monthAgo: valueOnOrBefore(s, month),
        };
      })
      .sort((a, b) => a.months - b.months);
    boards.push({
      id,
      label: CURVE_LABELS[id] ?? id,
      points,
    });
  }
  const order = ["BRBMK", "BRLPRE", "BRNTNB", "UST"];
  boards.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return boards;
}

const IDEX_PLACEHOLDER: MarketInst = {
  ric: "JGPIDEX",
  name: "JGP IDEX",
  group_code: "credit",
  quote_type: "index_level",
  currency: "BRL",
  curve_id: null,
  tenor: null,
  enabled: false,
  notes: "Não está na LSEG",
};

const RIC_ORDER = [
  ".BVSP",
  ".SPX",
  ".SPXTR",
  "B5P211=SA",
  "IMAB11=SA",
  "B5MB11=SA",
  "IRFM11=SA",
  "RTDI1=B3",
  "BRCDIACC1M=RR",
  "BRCDIACC3M=RR",
  "BRCDIACC6M=RR",
  "BRCDIACC1Y=RR",
  ".ANBIIDADI",
  "JGPIDEX",
  "BRL=",
  ".DXY",
  "LCOc1",
  "CLc1",
  "GCc1",
  "HGc1",
  "TIOc1",
  "Cc1",
  "Sc1",
  "KCc1",
  "SBc1",
];

const RIC_RANK = new Map(RIC_ORDER.map((ric, i) => [ric, i]));

function sortRows(rows: MarketRow[]): MarketRow[] {
  return [...rows].sort((a, b) => {
    const ia = RIC_RANK.get(a.ric) ?? 1000;
    const ib = RIC_RANK.get(b.ric) ?? 1000;
    if (ia !== ib) return ia - ib;
    return a.name.localeCompare(b.name, "pt");
  });
}

export function hasLineSeries(row: MarketRow): boolean {
  if (!row.enabled) return false;
  if (row.group === "curve" || row.group === "rates") return false;
  if (row.group === "fi_anbima") return true;
  return (
    row.quoteType === "index_level" ||
    row.quoteType === "price" ||
    row.quoteType === "fx"
  );
}

/** Monta o payload da tela a partir das tabelas brutas. */
export function buildMarketPayload(
  instruments: MarketInst[],
  prices: MarketPrice[]
): MarketPayload {
  const list = instruments.some((i) => /idex/i.test(i.name) || /idex/i.test(i.ric))
    ? instruments
    : [...instruments, IDEX_PLACEHOLDER];
  const byPrice = byRic(prices);
  let asOf: string | null = null;
  for (const pts of byPrice.values()) {
    const last = pts.at(-1)?.date ?? null;
    if (last && (!asOf || last > asOf)) asOf = last;
  }
  const rows = sortRows(
    list
      .filter((inst) => inst.group_code !== "curve")
      .map((inst) => toRow(inst, byPrice.get(inst.ric) ?? []))
  );
  const series: Record<string, MarketPoint[]> = {};
  for (const row of rows) {
    if (!hasLineSeries(row)) continue;
    series[row.ric] = byPrice.get(row.ric) ?? [];
  }
  return {
    asOf,
    rows,
    series,
    curves: buildCurves(list, byPrice, asOf),
  };
}
