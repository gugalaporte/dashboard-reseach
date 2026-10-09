import type { AnnualPoint, SeriesPoint } from "./bottom-up-types";

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pct(n: number | null, d: number | null): number | null {
  if (n == null || d == null || d === 0) return null;
  return (n / d) * 100;
}

function times(n: number | null, d: number | null): number | null {
  if (n == null || d == null || d === 0) return null;
  return n / d;
}

export function isAnnualPeriod(periodType: string | null | undefined): boolean {
  if (!periodType) return true;
  return (
    /annual|yearly|a\b|fy/i.test(periodType) &&
    !/quarter|qtr|interim/i.test(periodType)
  );
}

/** Lê o trimestre em period_type/label (Q1, 1Q24, 1T23). */
export function parseQuarter(
  periodType: string | null | undefined,
  periodLabel: string | null | undefined
): number | null {
  const s = `${periodType ?? ""} ${periodLabel ?? ""}`;
  const yq = s.match(/20\d{2}\s*[-.]?Q\s*([1-4])/i);
  if (yq) {
    const q = Number(yq[1]);
    return q >= 1 && q <= 4 ? q : null;
  }
  const m =
    s.match(/\bQ\s*([1-4])\b/i) ||
    s.match(/\b([1-4])Q\d{2}\b/i) ||
    s.match(/\b([1-4])\s*Q\b/i) ||
    s.match(/\b([1-4])T\d{2}\b/i) ||
    s.match(/\bT\s*([1-4])\b/i) ||
    s.match(/\b([1-4])\s*T\b/i);
  if (!m) return null;
  const q = Number(m[1]);
  return q >= 1 && q <= 4 ? q : null;
}

export type AnnualRaw = {
  period_year?: unknown;
  period_label?: string | null;
  period_type?: string | null;
  as_of_date?: string | null;
  revenue?: unknown;
  ebitda?: unknown;
  net_income?: unknown;
  free_cash_flow?: unknown;
  total_debt?: unknown;
};

function ratios(row: {
  revenue: number | null;
  ebitda: number | null;
  netIncome: number | null;
  freeCashFlow: number | null;
  totalDebt: number | null;
  date: string;
  label: string;
}): SeriesPoint {
  return {
    date: row.date,
    label: row.label,
    roe: null,
    roic: null,
    ebitda: row.ebitda,
    ebitdaMargin: pct(row.ebitda, row.revenue),
    netMargin: pct(row.netIncome, row.revenue),
    netDebtEbitda: times(row.totalDebt, row.ebitda),
    freeCashFlow: row.freeCashFlow,
    peRatio: null,
    evEbitda: null,
    price: null,
  };
}

/** Um ponto por ano, preferindo período anual. */
export function buildAnnualPoints(rows: AnnualRaw[]): AnnualPoint[] {
  const byYear = new Map<number, AnnualPoint & { annual: boolean }>();
  for (const row of rows) {
    const year = num(row.period_year);
    if (year == null) continue;
    const annual = isAnnualPeriod(row.period_type);
    const point: AnnualPoint & { annual: boolean } = {
      year,
      label: String(year),
      revenue: num(row.revenue),
      ebitda: num(row.ebitda),
      netIncome: num(row.net_income),
      freeCashFlow: num(row.free_cash_flow),
      totalDebt: num(row.total_debt),
      annual,
    };
    const prev = byYear.get(year);
    if (!prev || (annual && !prev.annual)) byYear.set(year, point);
  }
  return [...byYear.values()]
    .sort((a, b) => a.year - b.year)
    .map((p) => ({
      year: p.year,
      label: p.label,
      revenue: p.revenue,
      ebitda: p.ebitda,
      netIncome: p.netIncome,
      freeCashFlow: p.freeCashFlow,
      totalDebt: p.totalDebt,
    }));
}

export function seriesFromAnnual(annual: AnnualPoint[]): SeriesPoint[] {
  return annual.map((a) =>
    ratios({
      ...a,
      date: `${a.year}-12-31`,
      label: String(a.year),
    })
  );
}

function buildQuarterSeries(rows: AnnualRaw[]): SeriesPoint[] {
  const byKey = new Map<string, SeriesPoint & { asOf: string }>();
  for (const row of rows) {
    const year = num(row.period_year);
    const q = parseQuarter(row.period_type, row.period_label);
    if (year == null || q == null) continue;
    const month = String(q * 3).padStart(2, "0");
    const asOf = String(row.as_of_date ?? "");
    const key = `${year}-Q${q}`;
    const prev = byKey.get(key);
    if (prev && asOf && prev.asOf && asOf < prev.asOf) continue;
    byKey.set(key, {
      ...ratios({
        date: `${year}-${month}-01`,
        label: `${q}T${String(year).slice(2)}`,
        revenue: num(row.revenue),
        ebitda: num(row.ebitda),
        netIncome: num(row.net_income),
        freeCashFlow: num(row.free_cash_flow),
        totalDebt: num(row.total_debt),
      }),
      asOf,
    });
  }
  return [...byKey.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((p) => ({
      date: p.date,
      label: p.label,
      roe: p.roe,
      roic: p.roic,
      ebitda: p.ebitda,
      ebitdaMargin: p.ebitdaMargin,
      netMargin: p.netMargin,
      netDebtEbitda: p.netDebtEbitda,
      freeCashFlow: p.freeCashFlow,
      peRatio: p.peRatio,
      evEbitda: p.evEbitda,
      price: p.price,
    }));
}

/** Trimestre quando houver; anos sem trimestre entram como ponto anual. */
export function buildFiscalSeries(rows: AnnualRaw[]): SeriesPoint[] {
  const quarters = buildQuarterSeries(rows);
  const annual = seriesFromAnnual(buildAnnualPoints(rows));
  if (quarters.length < 2) return annual;
  const yearsWithQ = new Set(quarters.map((p) => p.date.slice(0, 4)));
  const fill = annual.filter((p) => !yearsWithQ.has(p.date.slice(0, 4)));
  return [...fill, ...quarters].sort((a, b) => a.date.localeCompare(b.date));
}

/** Último snapshot de cada ano (série diária → evolução anual). */
export function lastPointPerYear(series: SeriesPoint[]): SeriesPoint[] {
  const byYear = new Map<string, SeriesPoint>();
  for (const p of series) {
    const y = p.date.slice(0, 4);
    if (!y) continue;
    byYear.set(y, { ...p, label: p.label ?? y });
  }
  return [...byYear.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function countWithData(
  points: SeriesPoint[],
  keys: (keyof SeriesPoint)[]
): number {
  return points.filter((p) => keys.some((k) => p[k] != null)).length;
}

function yearSpan(points: SeriesPoint[]): number {
  return new Set(points.map((p) => p.date.slice(0, 4))).size;
}

/** Prefere trimestre/ano fiscal; snapshot diário só se cobrir 2+ anos. */
export function pickEvolutionSeries(
  daily: SeriesPoint[],
  fiscal: SeriesPoint[],
  keys: (keyof SeriesPoint)[]
): SeriesPoint[] {
  if (countWithData(fiscal, keys) >= 2) return fiscal;
  const yearly = lastPointPerYear(daily);
  if (countWithData(yearly, keys) >= 2 && yearSpan(yearly) >= 2) return yearly;
  return [];
}
