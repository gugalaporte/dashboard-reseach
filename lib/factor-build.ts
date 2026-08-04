import { latestSnapshots, type LsegCompanyRow, type LsegDailySnapshotRow, type LsegForwardEstimateRow } from "./lseg-transform";
import type { FactorInput } from "./factor-scoring";

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Forward mais recente por ric (as_of_date, depois fiscal_year). */
export function latestForwardByRic(
  rows: LsegForwardEstimateRow[]
): Map<string, LsegForwardEstimateRow> {
  const map = new Map<string, LsegForwardEstimateRow>();
  for (const row of rows) {
    const prev = map.get(row.ric);
    if (!prev) {
      map.set(row.ric, row);
      continue;
    }
    const d = row.as_of_date ?? "";
    const pd = prev.as_of_date ?? "";
    if (d > pd) {
      map.set(row.ric, row);
      continue;
    }
    if (d === pd) {
      const y = Number(row.fiscal_year) || 0;
      const py = Number(prev.fiscal_year) || 0;
      if (y > py) map.set(row.ric, row);
    }
  }
  return map;
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

export function buildFactorInputs(
  companies: LsegCompanyRow[],
  snapshots: LsegDailySnapshotRow[],
  forward: LsegForwardEstimateRow[]
): FactorInput[] {
  const snaps = latestSnapshots(snapshots);
  const fwdMap = latestForwardByRic(forward);
  const byRic = new Map(companies.map((c) => [c.ric, c]));

  const inputs: FactorInput[] = [];
  for (const snap of snaps) {
    const company = byRic.get(snap.ric);
    const ticker =
      company?.ticker?.trim().toUpperCase() ||
      snap.ric.split(".")[0]?.toUpperCase() ||
      snap.ric;
    const fwd = fwdMap.get(snap.ric);

    inputs.push({
      ticker,
      ric: snap.ric,
      name: company?.name ?? null,
      sector: company?.sector ?? null,
      asOfDate: snap.as_of_date ?? null,
      roe: num(snap.roe),
      netMargin: num(snap.net_margin),
      ebitdaMargin: num(snap.ebitda_margin),
      currentRatio: num(snap.current_ratio),
      netDebtEbitda: num(snap.net_debt_ebitda),
      peRatio: num(snap.pe_ratio),
      peFwd: num(fwd?.pe_fwd),
      pbRatio: num(snap.pb_ratio),
      evEbitda: num(snap.ev_ebitda),
      upsidePct: num(snap.upside_pct),
      epsRev4wPct: num(fwd?.eps_rev_4w_pct),
      ret3m: num(snap.ret_3m),
      ret6m: num(snap.ret_6m),
      dividendYield: num(snap.dividend_yield),
      dyFwd: num(fwd?.dy_fwd),
      marketCap: num(snap.market_cap),
      dayVolume: num(snap.day_volume),
      analystCount: analystCount(snap),
      inPortfolio: Boolean(company?.in_portfolio),
    });
  }
  return inputs;
}
