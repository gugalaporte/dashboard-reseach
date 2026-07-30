import "server-only";

import { ALLOWED_TICKERS } from "./queries";
import { getResearchSupabase, hasResearchServiceKey } from "./supabase-research";
import {
  buildLsegRows,
  type LsegCompanyRow,
  type LsegDailySnapshotRow,
  type LsegForwardEstimateRow,
  type LsegHistoricalSeriesRow,
  type LsegRaw,
  type LsegViewRow,
} from "./lseg-transform";
import type { ResearchRow } from "./queries";

export { LSEG_FONTE } from "./lseg-transform";
export type { LsegViewRow };

type LoadOpts = {
  /** Se true, carrega todas as empresas LSEG (aba Dados LSEG). */
  allCompanies?: boolean;
};

const SNAPSHOT_SELECT =
  "ric,as_of_date,last_price,price_target,rating_label,upside_pct,pe_ratio,pb_ratio,ev_ebitda,net_debt_ebitda,dividend_yield,ev_to_sales,price_to_sales,net_margin,operating_margin,revenue,ebitda,net_income,gross_profit,operating_income,free_cash_flow,capex,total_debt,total_equity,market_cap,market_cap_currency,beta,roic,roe,price_52w_high,price_52w_low,ret_1m,ret_3m,ret_6m,ret_ytd,ret_1y,total_return,day_volume,price_target_high,price_target_low,price_target_median,num_buys,num_holds,num_sells,enterprise_value,net_debt,net_debt_to_equity,current_ratio,quick_ratio,interest_coverage,interest_expense,cash_from_ops,depreciation_amort,book_value_per_share,tangible_bvps,asset_turnover,gross_margin,ebitda_margin,wacc,dps_common,eps_fy0";

const FORWARD_SELECT =
  "ric,as_of_date,fiscal_year,eps_mean,dps_mean,pe_fwd,dy_fwd,revenue_mean,ebitda_mean,net_income_mean";

const HISTORICAL_SELECT =
  "ric,as_of_date,period_type,period_year,period_label,revenue,ebitda,net_income,free_cash_flow,capex,total_debt";

export async function loadLsegRaw(opts?: LoadOpts): Promise<LsegRaw> {
  const db = getResearchSupabase();
  const tickers = ALLOWED_TICKERS as unknown as string[];

  const companiesSelect =
    "ticker,ric,sector,name,gics_industry,updated_at,in_portfolio" as const;

  const companiesQuery = opts?.allCompanies
    ? db.from("companies").select(companiesSelect).returns<LsegCompanyRow[]>()
    : db
        .from("companies")
        .select(companiesSelect)
        .in("ticker", tickers)
        .returns<LsegCompanyRow[]>();

  const [cRes, sRes, fRes, hRes] = await Promise.all([
    companiesQuery,
    db
      .from("daily_snapshot")
      .select(SNAPSHOT_SELECT)
      .returns<LsegDailySnapshotRow[]>(),
    db
      .from("forward_estimates")
      .select(FORWARD_SELECT)
      .returns<LsegForwardEstimateRow[]>(),
    db
      .from("historical_series")
      .select(HISTORICAL_SELECT)
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

/** Linhas LSEG filtradas pelos tickers do Research. */
export async function loadLsegResearchRows(): Promise<ResearchRow[]> {
  if (!hasResearchServiceKey()) return [];
  try {
    const raw = await loadLsegRaw();
    return buildLsegRows(raw, ALLOWED_TICKERS);
  } catch (e) {
    console.error("[lseg] load failed:", e);
    return [];
  }
}

/** Todas as empresas LSEG (aba dedicada). */
export async function loadAllLsegViewRows(): Promise<LsegViewRow[]> {
  if (!hasResearchServiceKey()) return [];
  const raw = await loadLsegRaw({ allCompanies: true });
  return buildLsegRows(raw);
}
