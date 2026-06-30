import "server-only";

import { ALLOWED_TICKERS } from "./queries";
import { getResearchSupabase } from "./supabase-research";
import {
  buildLsegRows,
  type LsegCompanyRow,
  type LsegDailySnapshotRow,
  type LsegForwardEstimateRow,
  type LsegHistoricalSeriesRow,
  type LsegRaw,
} from "./lseg-transform";
import type { ResearchRow } from "./queries";

export { LSEG_FONTE } from "./lseg-transform";

export async function loadLsegRaw(): Promise<LsegRaw> {
  const db = getResearchSupabase();
  const tickers = ALLOWED_TICKERS as unknown as string[];

  const [cRes, sRes, fRes, hRes] = await Promise.all([
    db
      .from("companies")
      .select("ticker,ric,sector,name,gics_industry,updated_at")
      .in("ticker", tickers)
      .returns<LsegCompanyRow[]>(),
    db
      .from("daily_snapshot")
      .select(
        "ric,as_of_date,last_price,price_target,rating_label,upside_pct,pe_ratio,ev_ebitda,dividend_yield,revenue,ebitda,net_income,roic,roe"
      )
      .returns<LsegDailySnapshotRow[]>(),
    db
      .from("forward_estimates")
      .select("ric,fiscal_year,eps_mean,dps_mean")
      .returns<LsegForwardEstimateRow[]>(),
    db
      .from("historical_series")
      .select("ric,as_of_date,period_type,period_year,period_label,revenue,ebitda,net_income")
      .returns<LsegHistoricalSeriesRow[]>(),
  ]);

  if (cRes.error) throw cRes.error;
  if (sRes.error) throw sRes.error;
  if (fRes.error) throw fRes.error;
  if (hRes.error) throw hRes.error;

  return {
    companies: cRes.data ?? [],
    snapshots: sRes.data ?? [],
    forward: fRes.data ?? [],
    historical: hRes.data ?? [],
  };
}

export async function loadLsegResearchRows(): Promise<ResearchRow[]> {
  const raw = await loadLsegRaw();
  return buildLsegRows(raw, ALLOWED_TICKERS);
}
