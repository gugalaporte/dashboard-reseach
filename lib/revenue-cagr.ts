/** Crescimento composto da receita em 2 anos (3 exercícios anuais fechados). */

export type AnnualRevenueRow = {
  ric: string;
  as_of_date?: string | null;
  period_type?: string | null;
  period_year?: number | string | null;
  revenue?: number | null;
};

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isAnnual(periodType: string | null | undefined): boolean {
  if (!periodType) return false;
  return /annual|yearly|fy/i.test(periodType) && !/quarter|qtr|interim/i.test(periodType);
}

/** Ano-calendário anterior ao da data (exercício ainda aberto não entra). */
export function lastCompletedYear(asOfDate: string | null, now = new Date()): number {
  const y =
    asOfDate && /^\d{4}/.test(asOfDate)
      ? Number(asOfDate.slice(0, 4))
      : now.getFullYear();
  return y - 1;
}

/** (fim/início)^(1/2) − 1, em pontos percentuais. Receita precisa ser > 0. */
export function twoYearRevenueCagrPct(start: number, end: number): number | null {
  if (!(start > 0) || !(end > 0)) return null;
  return (Math.pow(end / start, 0.5) - 1) * 100;
}

/**
 * Último ano com receita anual ≤ lastCompleted, mais os dois anteriores.
 * Sem os três anos seguidos, a empresa fica de fora.
 */
export function revenueCagrByRic(
  rows: AnnualRevenueRow[],
  lastCompleted: number
): Map<string, number> {
  const best = new Map<string, { asOf: string; revenue: number }>();
  for (const row of rows) {
    if (!isAnnual(row.period_type)) continue;
    const year = num(row.period_year);
    const revenue = num(row.revenue);
    if (year == null || year > lastCompleted || revenue == null || !(revenue > 0)) {
      continue;
    }
    const key = `${row.ric}|${year}`;
    const asOf = row.as_of_date ?? "";
    const prev = best.get(key);
    if (!prev || asOf >= prev.asOf) best.set(key, { asOf, revenue });
  }

  const yearsByRic = new Map<string, Map<number, number>>();
  for (const [key, { revenue }] of best) {
    const sep = key.lastIndexOf("|");
    const ric = key.slice(0, sep);
    const year = Number(key.slice(sep + 1));
    let years = yearsByRic.get(ric);
    if (!years) {
      years = new Map();
      yearsByRic.set(ric, years);
    }
    years.set(year, revenue);
  }

  const out = new Map<string, number>();
  for (const [ric, years] of yearsByRic) {
    let latest = -Infinity;
    for (const y of years.keys()) if (y > latest) latest = y;
    const start = years.get(latest - 2);
    const mid = years.get(latest - 1);
    const end = years.get(latest);
    if (start == null || mid == null || end == null) continue;
    const cagr = twoYearRevenueCagrPct(start, end);
    if (cagr != null) out.set(ric, cagr);
  }
  return out;
}
