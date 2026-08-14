import { extractYear, type MetricId } from "./metrics";
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
  in_portfolio?: boolean | null;
};

export type LsegDailySnapshotRow = {
  ric: string;
  as_of_date: string | null;
  last_price: number | null;
  price_target: number | null;
  rating_label: string | null;
  upside_pct: number | null;
  pe_ratio: number | null;
  pb_ratio?: number | null;
  ev_ebitda: number | null;
  net_debt_ebitda?: number | null;
  dividend_yield: number | null;
  ev_to_sales?: number | null;
  price_to_sales?: number | null;
  net_margin?: number | null;
  operating_margin?: number | null;
  revenue: number | null;
  ebitda: number | null;
  net_income: number | null;
  gross_profit?: number | null;
  operating_income?: number | null;
  free_cash_flow?: number | null;
  capex?: number | null;
  total_debt?: number | null;
  total_equity?: number | null;
  market_cap?: number | null;
  market_cap_currency?: string | null;
  beta?: number | null;
  roic: number | null;
  roe: number | null;
  // Novos campos LSEG
  price_52w_high?: number | null;
  price_52w_low?: number | null;
  ret_1m?: number | null;
  ret_3m?: number | null;
  ret_6m?: number | null;
  ret_ytd?: number | null;
  ret_1y?: number | null;
  total_return?: number | null;
  day_volume?: number | null;
  analyst_count?: number | null;
  price_target_high?: number | null;
  price_target_low?: number | null;
  price_target_median?: number | null;
  num_buys?: number | null;
  num_holds?: number | null;
  num_sells?: number | null;
  enterprise_value?: number | null;
  net_debt?: number | null;
  net_debt_to_equity?: number | null;
  current_ratio?: number | null;
  quick_ratio?: number | null;
  interest_coverage?: number | null;
  interest_expense?: number | null;
  cash_from_ops?: number | null;
  depreciation_amort?: number | null;
  book_value_per_share?: number | null;
  tangible_bvps?: number | null;
  asset_turnover?: number | null;
  gross_margin?: number | null;
  ebitda_margin?: number | null;
  wacc?: number | null;
  dps_common?: number | null;
  eps_fy0?: number | null;
};

export type LsegForwardEstimateRow = {
  ric: string;
  as_of_date?: string | null;
  fiscal_year: number | string | null;
  eps_mean: number | null;
  dps_mean: number | null;
  pe_fwd?: number | null;
  dy_fwd?: number | null;
  eps_rev_4w_pct?: number | null;
  revenue_mean?: number | null;
  ebitda_mean?: number | null;
  net_income_mean?: number | null;
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
  free_cash_flow?: number | null;
  capex?: number | null;
  total_debt?: number | null;
};

export type LsegRaw = {
  companies: LsegCompanyRow[];
  snapshots: LsegDailySnapshotRow[];
  forward: LsegForwardEstimateRow[];
  historical: LsegHistoricalSeriesRow[];
};

/** Linha da aba Dados LSEG (ResearchRow + identidade RIC/nome/carteira). */
export type LsegViewRow = ResearchRow & {
  ric: string;
  name: string | null;
  inPortfolio: boolean;
};

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Converte valores absolutos LSEG para R$ milhões (formato da UI). */
function toMillions(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  return Math.abs(n) >= 1_000_000 ? n / 1_000_000 : n;
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

function snapYear(asOf: string | null): string {
  if (asOf && /^\d{4}/.test(asOf)) return asOf.slice(0, 4);
  return String(new Date().getFullYear());
}

function putMetricYear(
  bucket: Partial<Record<string, Cell>>,
  year: string,
  cell: Cell | undefined
): void {
  if (!cell) return;
  bucket[year] = cell;
}

function putMetricYearIfEmpty(
  byMetricYear: NonNullable<ResearchRow["byMetricYear"]>,
  id: MetricId,
  year: string,
  cell: Cell | undefined
): void {
  if (!cell) return;
  const bucket = (byMetricYear[id] ??= {});
  if (bucket[year]) return;
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

function isAnnual(periodType: string | null | undefined): boolean {
  if (!periodType) return true;
  return /annual|yearly|a\b|fy/i.test(periodType) && !/quarter|qtr|interim/i.test(periodType);
}

/** Mantém série histórica mais recente por (ric, ano), preferindo ANNUAL. */
export function latestHistorical(rows: LsegHistoricalSeriesRow[]): LsegHistoricalSeriesRow[] {
  const byKey = new Map<string, LsegHistoricalSeriesRow>();
  for (const row of rows) {
    const year = yearFromHistorical(row);
    if (!year) continue;
    const key = `${row.ric}|${year}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, row);
      continue;
    }
    const prevAnnual = isAnnual(prev.period_type);
    const nextAnnual = isAnnual(row.period_type);
    if (nextAnnual && !prevAnnual) {
      byKey.set(key, row);
      continue;
    }
    if (prevAnnual && !nextAnnual) continue;
    const d = row.as_of_date ?? "";
    const pd = prev.as_of_date ?? "";
    if (d > pd) byKey.set(key, row);
  }
  return [...byKey.values()];
}

function buildOneLsegRow(args: {
  ticker: string;
  ric: string;
  company?: LsegCompanyRow;
  snap?: LsegDailySnapshotRow;
  forward: LsegForwardEstimateRow[];
  historical: LsegHistoricalSeriesRow[];
}): LsegViewRow | null {
  const { ticker, ric, company, snap, forward, historical } = args;
  const asOf = snap?.as_of_date ?? company?.updated_at ?? null;
  const priceVal = num(snap?.last_price);
  const ratingLabel = snap?.rating_label?.trim() || null;
  const byMetricYear: NonNullable<ResearchRow["byMetricYear"]> = {};
  const ySnap = snapYear(asOf);

  // 1) Histórico por ano (valores absolutos → milhões)
  for (const hs of historical) {
    const year = yearFromHistorical(hs);
    if (!year) continue;
    const hsDate = hs.as_of_date ?? asOf;
    putMetricYear(
      (byMetricYear.revenue ??= {}),
      year,
      makeCell(toMillions(hs.revenue), hsDate, { periodo: year, unidade: "R$ M" })
    );
    putMetricYear(
      (byMetricYear.ebitda ??= {}),
      year,
      makeCell(toMillions(hs.ebitda), hsDate, { periodo: year, unidade: "R$ M" })
    );
    putMetricYear(
      (byMetricYear.net_income ??= {}),
      year,
      makeCell(toMillions(hs.net_income), hsDate, { periodo: year, unidade: "R$ M" })
    );
    putMetricYear(
      (byMetricYear.free_cash_flow ??= {}),
      year,
      makeCell(toMillions(hs.free_cash_flow), hsDate, { periodo: year, unidade: "R$ M" })
    );
    putMetricYear(
      (byMetricYear.capex ??= {}),
      year,
      makeCell(toMillions(hs.capex), hsDate, { periodo: year, unidade: "R$ M" })
    );
    putMetricYear(
      (byMetricYear.net_debt ??= {}),
      year,
      makeCell(toMillions(hs.total_debt), hsDate, { periodo: year, unidade: "R$ M" })
    );
  }

  // 2) Forward por ano fiscal
  for (const fe of forward) {
    const year = yearFromFiscalYear(fe.fiscal_year);
    if (!year) continue;
    const feDate = fe.as_of_date ?? asOf;

    putMetricYear(
      (byMetricYear.eps ??= {}),
      year,
      makeCell(fe.eps_mean, feDate, { periodo: `${year}E`, unidade: "R$" })
    );
    putMetricYear(
      (byMetricYear.net_dps ??= {}),
      year,
      makeCell(fe.dps_mean, feDate, { periodo: `${year}E`, unidade: "R$" })
    );
    putMetricYear(
      (byMetricYear.pe ??= {}),
      year,
      makeCell(fe.pe_fwd, feDate, { periodo: `${year}E`, unidade: "x" })
    );
    putMetricYear(
      (byMetricYear.dy ??= {}),
      year,
      makeCell(fe.dy_fwd, feDate, { periodo: `${year}E`, unidade: "%" })
    );
    putMetricYear(
      (byMetricYear.revenue ??= {}),
      year,
      makeCell(toMillions(fe.revenue_mean), feDate, {
        periodo: `${year}E`,
        unidade: "R$ M",
      })
    );
    putMetricYear(
      (byMetricYear.ebitda ??= {}),
      year,
      makeCell(toMillions(fe.ebitda_mean), feDate, {
        periodo: `${year}E`,
        unidade: "R$ M",
      })
    );
    putMetricYear(
      (byMetricYear.net_income ??= {}),
      year,
      makeCell(toMillions(fe.net_income_mean), feDate, {
        periodo: `${year}E`,
        unidade: "R$ M",
      })
    );

    // Fallback: P/E derivado se não veio pe_fwd
    if (!byMetricYear.pe?.[year] && priceVal != null && priceVal > 0) {
      const eps = num(fe.eps_mean);
      if (eps != null && eps > 0) {
        putMetricYear(
          (byMetricYear.pe ??= {}),
          year,
          makeCell(priceVal / eps, feDate, {
            periodo: `${year}E`,
            unidade: "x",
            derived: true,
            formula: "Preço LSEG / EPS consenso",
          })
        );
      }
    }
  }

  // 3) Snapshot “atual” no ano do as_of (não sobrescreve forward/histórico)
  if (snap) {
    const snapCcy =
      snap.market_cap_currency?.toUpperCase() === "USD"
        ? "US$"
        : defaultCcyForTicker(ticker);

    putMetricYearIfEmpty(
      byMetricYear,
      "pe",
      ySnap,
      makeCell(snap.pe_ratio, asOf, { periodo: "Atual", unidade: "x" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "p_bv",
      ySnap,
      makeCell(snap.pb_ratio, asOf, { periodo: "Atual", unidade: "x" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "ev_ebitda",
      ySnap,
      makeCell(snap.ev_ebitda, asOf, { periodo: "Atual", unidade: "x" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "nd_ebitda",
      ySnap,
      makeCell(snap.net_debt_ebitda, asOf, { periodo: "Atual", unidade: "x" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "dy",
      ySnap,
      makeCell(snap.dividend_yield, asOf, { periodo: "Atual", unidade: "%" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "roe",
      ySnap,
      makeCell(snap.roe, asOf, { periodo: "Atual", unidade: "%" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "roic",
      ySnap,
      makeCell(snap.roic, asOf, { periodo: "Atual", unidade: "%" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "operating_margin",
      ySnap,
      makeCell(snap.operating_margin, asOf, { periodo: "Atual", unidade: "%" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "net_margin",
      ySnap,
      makeCell(snap.net_margin, asOf, { periodo: "Atual", unidade: "%" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "gross_margin",
      ySnap,
      makeCell(snap.gross_margin, asOf, { periodo: "Atual", unidade: "%" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "ebitda_margin",
      ySnap,
      makeCell(snap.ebitda_margin, asOf, { periodo: "Atual", unidade: "%" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "wacc",
      ySnap,
      makeCell(snap.wacc, asOf, { periodo: "Atual", unidade: "%" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "beta",
      ySnap,
      makeCell(snap.beta, asOf, { periodo: "Atual", unidade: "x" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "ev_sales",
      ySnap,
      makeCell(snap.ev_to_sales, asOf, { periodo: "Atual", unidade: "x" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "ps",
      ySnap,
      makeCell(snap.price_to_sales, asOf, { periodo: "Atual", unidade: "x" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "nd_equity",
      ySnap,
      makeCell(snap.net_debt_to_equity, asOf, { periodo: "Atual", unidade: "x" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "current_ratio",
      ySnap,
      makeCell(snap.current_ratio, asOf, { periodo: "Atual", unidade: "x" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "quick_ratio",
      ySnap,
      makeCell(snap.quick_ratio, asOf, { periodo: "Atual", unidade: "x" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "interest_coverage",
      ySnap,
      makeCell(snap.interest_coverage, asOf, { periodo: "Atual", unidade: "x" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "asset_turnover",
      ySnap,
      makeCell(snap.asset_turnover, asOf, { periodo: "Atual", unidade: "x" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "revenue",
      ySnap,
      makeCell(toMillions(snap.revenue), asOf, { periodo: "Atual", unidade: "R$ M" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "ebitda",
      ySnap,
      makeCell(toMillions(snap.ebitda), asOf, { periodo: "Atual", unidade: "R$ M" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "net_income",
      ySnap,
      makeCell(toMillions(snap.net_income), asOf, { periodo: "Atual", unidade: "R$ M" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "gross_profit",
      ySnap,
      makeCell(toMillions(snap.gross_profit), asOf, { periodo: "Atual", unidade: "R$ M" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "operating_income",
      ySnap,
      makeCell(toMillions(snap.operating_income), asOf, {
        periodo: "Atual",
        unidade: "R$ M",
      })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "free_cash_flow",
      ySnap,
      makeCell(toMillions(snap.free_cash_flow), asOf, {
        periodo: "Atual",
        unidade: "R$ M",
      })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "capex",
      ySnap,
      makeCell(toMillions(snap.capex), asOf, { periodo: "Atual", unidade: "R$ M" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "cash_from_ops",
      ySnap,
      makeCell(toMillions(snap.cash_from_ops), asOf, {
        periodo: "Atual",
        unidade: "R$ M",
      })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "depreciation_amort",
      ySnap,
      makeCell(toMillions(snap.depreciation_amort), asOf, {
        periodo: "Atual",
        unidade: "R$ M",
      })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "interest_expense",
      ySnap,
      makeCell(toMillions(snap.interest_expense), asOf, {
        periodo: "Atual",
        unidade: "R$ M",
      })
    );
    // Prefere net_debt real; fallback total_debt
    putMetricYearIfEmpty(
      byMetricYear,
      "net_debt",
      ySnap,
      makeCell(toMillions(snap.net_debt ?? snap.total_debt), asOf, {
        periodo: "Atual",
        unidade: "R$ M",
      })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "enterprise_value",
      ySnap,
      makeCell(toMillions(snap.enterprise_value), asOf, {
        periodo: "Atual",
        unidade: snapCcy === "US$" ? "US$ M" : "R$ M",
      })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "market_cap",
      ySnap,
      makeCell(toMillions(snap.market_cap), asOf, {
        periodo: "Atual",
        unidade: snapCcy === "US$" ? "US$ M" : "R$ M",
      })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "total_equity",
      ySnap,
      makeCell(toMillions(snap.total_equity), asOf, { periodo: "Atual", unidade: "R$ M" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "eps",
      ySnap,
      makeCell(snap.eps_fy0, asOf, { periodo: "FY0", unidade: snapCcy })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "net_dps",
      ySnap,
      makeCell(snap.dps_common, asOf, { periodo: "Atual", unidade: snapCcy })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "bvps",
      ySnap,
      makeCell(snap.book_value_per_share, asOf, { periodo: "Atual", unidade: snapCcy })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "tangible_bvps",
      ySnap,
      makeCell(snap.tangible_bvps, asOf, { periodo: "Atual", unidade: snapCcy })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "price_52w_high",
      ySnap,
      makeCell(snap.price_52w_high, asOf, { periodo: "Atual", unidade: snapCcy })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "price_52w_low",
      ySnap,
      makeCell(snap.price_52w_low, asOf, { periodo: "Atual", unidade: snapCcy })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "target_high",
      ySnap,
      makeCell(snap.price_target_high, asOf, { periodo: "12m", unidade: snapCcy })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "target_low",
      ySnap,
      makeCell(snap.price_target_low, asOf, { periodo: "12m", unidade: snapCcy })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "target_median",
      ySnap,
      makeCell(snap.price_target_median, asOf, { periodo: "12m", unidade: snapCcy })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "ret_1m",
      ySnap,
      makeCell(snap.ret_1m, asOf, { periodo: "1M", unidade: "%" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "ret_3m",
      ySnap,
      makeCell(snap.ret_3m, asOf, { periodo: "3M", unidade: "%" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "ret_6m",
      ySnap,
      makeCell(snap.ret_6m, asOf, { periodo: "6M", unidade: "%" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "ret_ytd",
      ySnap,
      makeCell(snap.ret_ytd, asOf, { periodo: "YTD", unidade: "%" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "ret_1y",
      ySnap,
      makeCell(snap.ret_1y, asOf, { periodo: "1Y", unidade: "%" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "total_return",
      ySnap,
      makeCell(snap.total_return, asOf, { periodo: "Atual", unidade: "%" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "day_volume",
      ySnap,
      makeCell(snap.day_volume, asOf, { periodo: "Atual" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "num_buys",
      ySnap,
      makeCell(snap.num_buys, asOf, { periodo: "Atual" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "num_holds",
      ySnap,
      makeCell(snap.num_holds, asOf, { periodo: "Atual" })
    );
    putMetricYearIfEmpty(
      byMetricYear,
      "num_sells",
      ySnap,
      makeCell(snap.num_sells, asOf, { periodo: "Atual" })
    );
  }

  let target: TargetCell | undefined;
  const targetVal =
    num(snap?.price_target) ?? num(snap?.price_target_median);
  if (targetVal != null) {
    const ccy =
      snap?.market_cap_currency?.toUpperCase() === "USD"
        ? "US$"
        : defaultCcyForTicker(ticker);
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
  // Empresas em carteira entram mesmo sem snapshot LSEG (ex.: VTRU3).
  if (!hasData && !Boolean(company?.in_portfolio)) return null;

  return {
    empresa: ticker,
    ric,
    name: company?.name ?? null,
    inPortfolio: Boolean(company?.in_portfolio),
    fonte: LSEG_FONTE,
    sector: company?.sector ?? company?.gics_industry ?? null,
    rating: ratingLabel ? { value: ratingLabel, date: asOf } : undefined,
    price: priceVal != null ? { value: priceVal, date: asOf } : undefined,
    target,
    pe: makeCell(snap?.pe_ratio, asOf, { unidade: "x" }),
    ev_ebitda: makeCell(snap?.ev_ebitda, asOf, { unidade: "x" }),
    dy: makeCell(snap?.dividend_yield, asOf, { unidade: "%" }),
    roic: makeCell(snap?.roic, asOf, { unidade: "%" }),
    revenue: makeCell(toMillions(snap?.revenue), asOf, { unidade: "R$ M" }),
    ebitda: makeCell(toMillions(snap?.ebitda), asOf, { unidade: "R$ M" }),
    net_income: makeCell(toMillions(snap?.net_income), asOf, { unidade: "R$ M" }),
    net_debt: makeCell(toMillions(snap?.net_debt ?? snap?.total_debt), asOf, {
      unidade: "R$ M",
    }),
    byMetricYear: Object.keys(byMetricYear).length > 0 ? byMetricYear : undefined,
  };
}

/** Se `allowedTickers` for omitido, inclui todos os RICs com dados. */
export function buildLsegRows(
  raw: LsegRaw,
  allowedTickers?: readonly string[] | null
): LsegViewRow[] {
  const allowed = allowedTickers
    ? new Set(allowedTickers.map((t) => t.trim().toUpperCase()))
    : null;
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

  const out: LsegViewRow[] = [];

  for (const ric of allRics) {
    const company = companyByRic.get(ric);
    const ticker =
      company?.ticker?.trim().toUpperCase() || ricToTicker(ric);
    if (!ticker) continue;
    if (allowed && !allowed.has(ticker)) continue;

    const row = buildOneLsegRow({
      ticker,
      ric,
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
