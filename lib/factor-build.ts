import { latestSnapshots, type LsegCompanyRow, type LsegDailySnapshotRow, type LsegForwardEstimateRow, type LsegHistoricalSeriesRow } from "./lseg-transform";
import type { FactorInput } from "./factor-scoring";
import { lastCompletedYear, revenueCagrByRic } from "./revenue-cagr";
import { displayTicker } from "./finacap-book";

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function winsForward(
  row: LsegForwardEstimateRow,
  prev: LsegForwardEstimateRow,
  preferHigherYear: boolean
): boolean {
  const d = row.as_of_date ?? "";
  const pd = prev.as_of_date ?? "";
  if (d !== pd) return d > pd;
  const y = Number(row.fiscal_year) || 0;
  const py = Number(prev.fiscal_year) || 0;
  return preferHigherYear ? y > py : y < py;
}

/** Forward mais recente por ric (as_of_date, depois fiscal_year). */
export function latestForwardByRic(
  rows: LsegForwardEstimateRow[]
): Map<string, LsegForwardEstimateRow> {
  const map = new Map<string, LsegForwardEstimateRow>();
  for (const row of rows) {
    const prev = map.get(row.ric);
    if (!prev || winsForward(row, prev, true)) map.set(row.ric, row);
  }
  return map;
}

function filledForward(
  rows: LsegForwardEstimateRow[],
  read: (row: LsegForwardEstimateRow) => number | null,
  preferHigherYear: boolean
): Map<string, LsegForwardEstimateRow> {
  const map = new Map<string, LsegForwardEstimateRow>();
  for (const row of rows) {
    if (read(row) == null) continue;
    const prev = map.get(row.ric);
    if (!prev || winsForward(row, prev, preferHigherYear)) map.set(row.ric, row);
  }
  return map;
}

/** Maior ano fiscal com o campo preenchido, na data mais recente. */
export function latestFilledForward(
  rows: LsegForwardEstimateRow[],
  read: (row: LsegForwardEstimateRow) => number | null
): Map<string, LsegForwardEstimateRow> {
  return filledForward(rows, read, true);
}

/** FY1: menor ano fiscal com o campo preenchido, na data mais recente. */
export function nearestFilledForward(
  rows: LsegForwardEstimateRow[],
  read: (row: LsegForwardEstimateRow) => number | null
): Map<string, LsegForwardEstimateRow> {
  return filledForward(rows, read, false);
}

function analystCount(snap: LsegDailySnapshotRow): number | null {
  const direct = num(snap.analyst_count);
  if (direct != null) return direct;
  const buys = num(snap.num_buys) ?? 0;
  const holds = num(snap.num_holds) ?? 0;
  const sells = num(snap.num_sells) ?? 0;
  const sum = buys + holds + sells;
  return sum > 0 ? sum : null;
}

/**
 * Último valor não-nulo por RIC (datas mais novas sobrescrevem).
 * Snapshot da manhã às vezes chega sem day_volume; o screening usaria
 * null e cortaria o universo inteiro no filtro de elegibilidade.
 */
function lastKnownByRic(
  rows: LsegDailySnapshotRow[],
  read: (row: LsegDailySnapshotRow) => number | null
): Map<string, number> {
  const sorted = [...rows].sort((a, b) =>
    (a.as_of_date ?? "").localeCompare(b.as_of_date ?? "")
  );
  const map = new Map<string, number>();
  for (const row of sorted) {
    const v = read(row);
    if (v != null) map.set(row.ric, v);
  }
  return map;
}

export function buildFactorInputs(
  companies: LsegCompanyRow[],
  snapshots: LsegDailySnapshotRow[],
  forward: LsegForwardEstimateRow[],
  historical: LsegHistoricalSeriesRow[] = []
): FactorInput[] {
  const snaps = latestSnapshots(snapshots);
  const lastVolume = lastKnownByRic(snapshots, (r) => num(r.day_volume));
  const fwdMap = latestForwardByRic(forward);
  const dyMap = nearestFilledForward(forward, (r) => num(r.dy_fwd));
  const qualityMap = nearestFilledForward(forward, (r) => num(r.quality_return_mean));
  const peMap = nearestFilledForward(forward, (r) => num(r.pe_fwd));
  const byRic = new Map(companies.map((c) => [c.ric, c]));

  let maxAsOf: string | null = null;
  for (const snap of snaps) {
    if (snap.as_of_date && (!maxAsOf || snap.as_of_date > maxAsOf)) {
      maxAsOf = snap.as_of_date;
    }
  }
  const cagrByRic = revenueCagrByRic(historical, lastCompletedYear(maxAsOf));

  const inputs: FactorInput[] = [];
  for (const snap of snaps) {
    const company = byRic.get(snap.ric);
    const ticker = displayTicker(
      company?.ticker?.trim().toUpperCase() ||
        snap.ric.split(".")[0]?.toUpperCase() ||
        snap.ric
    );
    const fwd = fwdMap.get(snap.ric);
    const quality = qualityMap.get(snap.ric);

    inputs.push({
      ticker,
      ric: snap.ric,
      name: company?.name ?? null,
      sector: company?.sector ?? null,
      asOfDate: snap.as_of_date ?? null,
      roe: num(snap.roe),
      roic: num(snap.roic) ?? num(snap.roic_calc),
      qualityReturn: num(quality?.quality_return_mean),
      qualitySource: quality?.quality_return_source ?? null,
      roicEbit: quality?.quality_return_source === "roic_calc" ? num(quality.ebit_mean) : null,
      roicTaxRate: quality?.quality_return_source === "roic_calc" ? num(quality.tax_rate_mean) : null,
      roicEquity: quality?.quality_return_source === "roic_calc" ? num(quality.equity_mean) : null,
      roicNetDebt: quality?.quality_return_source === "roic_calc" ? num(quality.net_debt_mean) : null,
      netMargin: num(snap.net_margin),
      ebitdaMargin: num(snap.ebitda_margin),
      currentRatio: num(snap.current_ratio),
      netDebtEbitda: num(snap.net_debt_ebitda),
      peRatio: num(snap.pe_ratio),
      peFwd: num(peMap.get(snap.ric)?.pe_fwd),
      pbRatio: num(snap.pb_ratio),
      evEbitda: num(snap.ev_ebitda),
      upsidePct: num(snap.upside_pct),
      epsRev4wPct: num(fwd?.eps_rev_4w_pct),
      ret3m: num(snap.ret_3m),
      ret6m: num(snap.ret_6m),
      dividendYield: num(snap.dividend_yield),
      dyFwd: num(dyMap.get(snap.ric)?.dy_fwd),
      marketCap: num(snap.market_cap),
      dayVolume: num(snap.day_volume) ?? lastVolume.get(snap.ric) ?? null,
      analystCount: analystCount(snap),
      revenueCagr: cagrByRic.get(snap.ric) ?? null,
      inPortfolio: Boolean(company?.in_portfolio),
    });
  }
  return inputs;
}
