import "server-only";

import { fetchAllRows } from "./supabase-page";
import { getResearchSupabase, hasResearchServiceKey } from "./supabase-research";
import {
  B3_TURNOVER_FROM,
  B3_TURNOVER_RIC,
  toB3Point,
  type B3TurnoverPoint,
} from "./b3-turnover";

type PriceRow = { trade_date: string; value: number | string | null };

/** Pregões B3.TURNOVER no intervalo (banco Research). */
export async function loadB3Turnover(
  fromIso: string,
  toIso: string
): Promise<B3TurnoverPoint[]> {
  if (!hasResearchServiceKey()) return [];
  const start = fromIso > B3_TURNOVER_FROM ? fromIso : B3_TURNOVER_FROM;
  const db = getResearchSupabase();
  const rows = await fetchAllRows<PriceRow>((from, to) =>
    db
      .from("market_prices")
      .select("trade_date,value")
      .eq("ric", B3_TURNOVER_RIC)
      .gte("trade_date", start)
      .lte("trade_date", toIso)
      .order("trade_date", { ascending: true })
      .range(from, to)
  );
  const out: B3TurnoverPoint[] = [];
  for (const row of rows) {
    const p = toB3Point(row.trade_date, row.value);
    if (p) out.push(p);
  }
  return out;
}
