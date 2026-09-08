import "server-only";

import { getResearchSupabase } from "./supabase-research";
import { fetchAllRows } from "./supabase-page";
import { buildMarketPayload, type MarketInst, type MarketPayload, type MarketPrice } from "./mercado";

const INST_SELECT =
  "ric,name,group_code,quote_type,currency,curve_id,tenor,enabled,notes";

function fromDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 45);
  return d.toISOString().slice(0, 10);
}

export async function loadMarketPayload(): Promise<MarketPayload> {
  const db = getResearchSupabase();
  const start = fromDate();
  const [instruments, prices] = await Promise.all([
    fetchAllRows<MarketInst>((from, to) =>
      db.from("market_instruments").select(INST_SELECT).range(from, to)
    ),
    fetchAllRows<MarketPrice>((from, to) =>
      db
        .from("market_prices")
        .select("ric,trade_date,value")
        .gte("trade_date", start)
        .range(from, to)
    ),
  ]);
  return buildMarketPayload(instruments, prices);
}
