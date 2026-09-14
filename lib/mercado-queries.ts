import "server-only";

import { getResearchSupabase } from "./supabase-research";
import { fetchAllRows } from "./supabase-page";
import { addDays, buildMarketPayload, type MarketInst, type MarketPayload, type MarketPrice } from "./mercado";

const INST_SELECT =
  "ric,name,group_code,quote_type,currency,curve_id,tenor,enabled,notes";

const LOOKBACK_DAYS = 45;

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Última data em market_prices. A janela segue o banco, não o relógio do servidor. */
async function latestTradeDate(
  db: ReturnType<typeof getResearchSupabase>
): Promise<string> {
  const { data, error } = await db
    .from("market_prices")
    .select("trade_date")
    .order("trade_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const iso = data?.trade_date?.slice(0, 10);
  return iso || utcToday();
}

export async function loadMarketPayload(): Promise<MarketPayload> {
  const db = getResearchSupabase();
  const asOf = await latestTradeDate(db);
  const start = addDays(asOf, -LOOKBACK_DAYS);
  const [instruments, prices] = await Promise.all([
    fetchAllRows<MarketInst>((from, to) =>
      db.from("market_instruments").select(INST_SELECT).order("ric").range(from, to)
    ),
    // order é obrigatório: sem ele o range do PostgREST corta linhas novas.
    fetchAllRows<MarketPrice>((from, to) =>
      db
        .from("market_prices")
        .select("ric,trade_date,value")
        .gte("trade_date", start)
        .order("ric", { ascending: true })
        .order("trade_date", { ascending: true })
        .range(from, to)
    ),
  ]);
  return { ...buildMarketPayload(instruments, prices), asOf };
}
