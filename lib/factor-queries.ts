import "server-only";

import { getResearchSupabase, hasResearchServiceKey } from "./supabase-research";
import type {
  LsegCompanyRow,
  LsegDailySnapshotRow,
  LsegForwardEstimateRow,
} from "./lseg-transform";
import {
  DEFAULT_ELIGIBILITY,
  scoreFactors,
  type FactorEligibility,
  type FactorRow,
} from "./factor-scoring";
import { buildFactorInputs } from "./factor-build";

const SNAPSHOT_BASE =
  "ric,as_of_date,roe,net_margin,ebitda_margin,current_ratio,net_debt_ebitda,pe_ratio,pb_ratio,ev_ebitda,upside_pct,ret_3m,ret_6m,dividend_yield,market_cap,day_volume,num_buys,num_holds,num_sells";

const FORWARD_BASE = "ric,as_of_date,fiscal_year,pe_fwd,dy_fwd";

export type FactorPayload = {
  asOfDate: string | null;
  eligibility: FactorEligibility;
  rows: FactorRow[];
  sectors: string[];
};

async function loadSnapshots(db: ReturnType<typeof getResearchSupabase>) {
  const withAnalyst = await db
    .from("daily_snapshot")
    .select(`${SNAPSHOT_BASE},analyst_count`)
    .returns<LsegDailySnapshotRow[]>();
  if (!withAnalyst.error) return withAnalyst.data ?? [];

  console.warn("[factors] analyst_count indisponível, usando num_buys/holds/sells");
  const fallback = await db
    .from("daily_snapshot")
    .select(SNAPSHOT_BASE)
    .returns<LsegDailySnapshotRow[]>();
  if (fallback.error) throw fallback.error;
  return fallback.data ?? [];
}

async function loadForward(db: ReturnType<typeof getResearchSupabase>) {
  const withRev = await db
    .from("forward_estimates")
    .select(`${FORWARD_BASE},eps_rev_4w_pct`)
    .returns<LsegForwardEstimateRow[]>();
  if (!withRev.error) return withRev.data ?? [];

  console.warn("[factors] eps_rev_4w_pct indisponível");
  const fallback = await db
    .from("forward_estimates")
    .select(FORWARD_BASE)
    .returns<LsegForwardEstimateRow[]>();
  if (fallback.error) throw fallback.error;
  return fallback.data ?? [];
}

/** Carrega dados LSEG e calcula ranking (somente leitura). */
export async function loadFactorRanking(
  eligibility: FactorEligibility = DEFAULT_ELIGIBILITY
): Promise<FactorPayload> {
  if (!hasResearchServiceKey()) {
    throw new Error(
      "SUPABASE_RESEARCH_SERVICE_KEY não configurada — necessária para ler tabelas LSEG."
    );
  }

  const db = getResearchSupabase();
  const [cRes, snapshots, forward] = await Promise.all([
    db
      .from("companies")
      .select("ticker,ric,sector,name,gics_industry,updated_at,in_portfolio")
      .returns<LsegCompanyRow[]>(),
    loadSnapshots(db),
    loadForward(db),
  ]);

  if (cRes.error) throw cRes.error;

  const inputs = buildFactorInputs(cRes.data ?? [], snapshots, forward);
  const rows = scoreFactors(inputs, eligibility);

  let asOfDate: string | null = null;
  for (const r of rows) {
    if (r.asOfDate && (!asOfDate || r.asOfDate > asOfDate)) asOfDate = r.asOfDate;
  }

  const sectors = [
    ...new Set(rows.map((r) => r.sector).filter((s): s is string => !!s?.trim())),
  ].sort();

  return { asOfDate, eligibility, rows, sectors };
}
