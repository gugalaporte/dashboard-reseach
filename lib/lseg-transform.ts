import { extractYear } from "./metrics";
import type { Cell, ResearchRow, TargetCell } from "./queries";

export const LSEG_FONTE = "LSEG" as const;

function defaultCcyForTicker(ticker: string): "R$" | "US$" {
  const t = (ticker ?? "").trim().toUpperCase();
  return /\d$/.test(t) ? "R$" : "US$";
}

/** PETR4.SA → PETR4 */
export function ricToTicker(ric: string): string {
  const r = ric.trim().toUpperCase();
  if (!r) return "";
  return r.split(".")[0] ?? r;
}

export type LsegCompanyRow = {
  ticker: string;
  ric: string;
  sector: string | null;
  name: string | null;
  gics_industry: string | null;
  updated_at: string | null;
};

export type LsegDailySnapshotRow = {
  ric: string;
  as_of_date: string | null;
  last_price: number | null;
  price_target: number | null;
  rating_label: string | null;
  upside_pct: number | null;
  pe_ratio: number | null;
  ev_ebitda: number | null;
  dividend_yield: number | null;
  revenue: number | null;
  ebitda: number | null;
  net_income: number | null;
  roic: number | null;
  roe: number | null;
};

export type LsegForwardEstimateRow = {
  ric: string;
  fiscal_year: number | string | null;
  eps_mean: number | null;
  dps_mean: number | null;
};

export type LsegHistoricalSeriesRow = {
  ric: string;
  as_of_date: string | null;
  period_type: string | null;
  period_year: number | null;
  period_label: string | null;
  revenue: number | null;
  ebitda: number | null;
  net_income: number | null;
};

export type LsegRaw = {
  companies: LsegCompanyRow[];
  snapshots: LsegDailySnapshotRow[];
  forward: LsegForwardEstimateRow[];
  historical: LsegHistoricalSeriesRow[];
};

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function makeCell(
  value: unknown,
  date: string | null,
  opts?: Partial<Cell>
): Cell | undefined {
  const n = num(value);
  if (n == null) return undefined;
  return { value: n, date, ...opts };
}

function yearFromFiscalYear(fy: number | string | null | undefined): string | null {
  if (fy == null) return null;
  const s = String(fy).trim();
  return extractYear(s) ?? (/^\d{4}$/.test(s) ? s : null);
}

function yearFromHistorical(hs: LsegHistoricalSeriesRow): string | null {
  if (hs.period_year != null) return String(hs.period_year);
  return extractYear(hs.period_label);
}

function putMetricYear(
  bucket: Partial<Record<string, Cell>>,
  year: string,
  cell: Cell | undefined
): void {
  if (!cell) return;
  bucket[year] = cell;
}

/** Mantém o snapshot mais recente por RIC. */
export function latestSnapshots(rows: LsegDailySnapshotRow[]): LsegDailySnapshotRow[] {
  const byRic = new Map<string, LsegDailySnapshotRow>();
  for (const row of rows) {
    const prev = byRic.get(row.ric);
    const d = row.as_of_date ?? "";
    const pd = prev?.as_of_date ?? "";
    if (!prev || d > pd) byRic.set(row.ric, row);
  }
  return [...byRic.values()];
}

/** Remove duplicatas de estimativas (ric + fiscal_year). */
export function dedupeForward(rows: LsegForwardEstimateRow[]): LsegForwardEstimateRow[] {
  const seen = new Map<string, LsegForwardEstimateRow>();
  for (const row of rows) {
    const year = yearFromFiscalYear(row.fiscal_year);
    if (!year) continue;
    seen.set(`${row.ric}|${year}`, row);
  }
  return [...seen.values()];
}

/** Mantém série histórica mais recente por (ric, ano). */
export function latestHistorical(rows: LsegHistoricalSeriesRow[]): LsegHistoricalSeriesRow[] {
  const byKey = new Map<string, LsegHistoricalSeriesRow>();
  for (const row of rows) {
    const year = yearFromHistorical(row);
    if (!year) continue;
    const key = `${row.ric}|${year}`;
    const prev = byKey.get(key);
    const d = row.as_of_date ?? "";
    const pd = prev?.as_of_date ?? "";
    if (!prev || d > pd) byKey.set(key, row);
  }
  return [...byKey.values()];
}

function buildOneLsegRow(args: {
  ticker: string;
  company?: LsegCompanyRow;
  snap?: LsegDailySnapshotRow;
  forward: LsegForwardEstimateRow[];
  historical: LsegHistoricalSeriesRow[];
}): ResearchRow | null {
  const { ticker, company, snap, forward, historical } = args;
  const asOf = snap?.as_of_date ?? company?.updated_at ?? null;
  const priceVal = num(snap?.last_price);
  const ratingLabel = snap?.rating_label?.trim() || null;
  const byMetricYear: ResearchRow["byMetricYear"] = {};

  for (const fe of forward) {
    const year = yearFromFiscalYear(fe.fiscal_year);
    if (!year) continue;

    putMetricYear(
      (byMetricYear.eps ??= {}),
      year,
      makeCell(fe.eps_mean, asOf, { periodo: `${year}E`, unidade: "R$" })
    );
    putMetricYear(
      (byMetricYear.net_dps ??= {}),
      year,
      makeCell(fe.dps_mean, asOf, { periodo: `${year}E`, unidade: "R$" })
    );

    if (priceVal != null && priceVal > 0) {
      const eps = num(fe.eps_mean);
      if (eps != null && eps > 0) {
        putMetricYear(
          (byMetricYear.pe ??= {}),
          year,
          makeCell(priceVal / eps, asOf, {
            periodo: `${year}E`,
            unidade: "x",
            derived: true,
            formula: "Preço LSEG / EPS consenso",
          })
        );
      }
    }
  }

  for (const hs of historical) {
    const year = yearFromHistorical(hs);
    if (!year) continue;
    putMetricYear(
      (byMetricYear.revenue ??= {}),
      year,
      makeCell(hs.revenue, asOf, { periodo: year, unidade: "R$ M" })
    );
    putMetricYear(
      (byMetricYear.ebitda ??= {}),
      year,
      makeCell(hs.ebitda, asOf, { periodo: year, unidade: "R$ M" })
    );
    putMetricYear(
      (byMetricYear.net_income ??= {}),
      year,
      makeCell(hs.net_income, asOf, { periodo: year, unidade: "R$ M" })
    );
  }

  let target: TargetCell | undefined;
  const targetVal = num(snap?.price_target);
  if (targetVal != null) {
    const ccy = defaultCcyForTicker(ticker);
    const upside =
      num(snap?.upside_pct) ??
      (priceVal != null && priceVal > 0
        ? ((targetVal - priceVal) / priceVal) * 100
        : null);
    target = {
      value: targetVal,
      ccy,
      date: asOf,
      periodo: "12m",
      unidade: ccy,
      upside,
    };
  }

  const hasData = snap != null || forward.length > 0 || historical.length > 0;
  if (!hasData) return null;

  return {
    empresa: ticker,
    fonte: LSEG_FONTE,
    sector: company?.sector ?? company?.gics_industry ?? null,
    rating: ratingLabel ? { value: ratingLabel, date: asOf } : undefined,
    price: priceVal != null ? { value: priceVal, date: asOf } : undefined,
    target,
    pe: makeCell(snap?.pe_ratio, asOf, { unidade: "x" }),
    ev_ebitda: makeCell(snap?.ev_ebitda, asOf, { unidade: "x" }),
    dy: makeCell(snap?.dividend_yield, asOf, { unidade: "%" }),
    roic: makeCell(snap?.roic, asOf, { unidade: "%" }),
    revenue: makeCell(snap?.revenue, asOf, { unidade: "R$ M" }),
    ebitda: makeCell(snap?.ebitda, asOf, { unidade: "R$ M" }),
    net_income: makeCell(snap?.net_income, asOf, { unidade: "R$ M" }),
    byMetricYear: Object.keys(byMetricYear).length > 0 ? byMetricYear : undefined,
  };
}

export function buildLsegRows(
  raw: LsegRaw,
  allowedTickers: readonly string[]
): ResearchRow[] {
  const allowed = new Set(allowedTickers.map((t) => t.trim().toUpperCase()));
  const companyByRic = new Map(raw.companies.map((c) => [c.ric, c]));
  const snapshotByRic = new Map(latestSnapshots(raw.snapshots).map((s) => [s.ric, s]));

  const forwardByRic = new Map<string, LsegForwardEstimateRow[]>();
  for (const row of dedupeForward(raw.forward)) {
    const list = forwardByRic.get(row.ric) ?? [];
    list.push(row);
    forwardByRic.set(row.ric, list);
  }

  const historicalByRic = new Map<string, LsegHistoricalSeriesRow[]>();
  for (const row of latestHistorical(raw.historical)) {
    const list = historicalByRic.get(row.ric) ?? [];
    list.push(row);
    historicalByRic.set(row.ric, list);
  }

  const allRics = new Set<string>();
  for (const c of raw.companies) allRics.add(c.ric);
  for (const s of snapshotByRic.keys()) allRics.add(s);
  for (const f of forwardByRic.keys()) allRics.add(f);
  for (const h of historicalByRic.keys()) allRics.add(h);

  const out: ResearchRow[] = [];

  for (const ric of allRics) {
    const company = companyByRic.get(ric);
    const ticker =
      company?.ticker?.trim().toUpperCase() || ricToTicker(ric);
    if (!ticker || !allowed.has(ticker)) continue;

    const row = buildOneLsegRow({
      ticker,
      company,
      snap: snapshotByRic.get(ric),
      forward: forwardByRic.get(ric) ?? [],
      historical: historicalByRic.get(ric) ?? [],
    });
    if (row) out.push(row);
  }

  return out.sort(
    (a, b) => a.empresa.localeCompare(b.empresa) || a.fonte.localeCompare(b.fonte)
  );
}
