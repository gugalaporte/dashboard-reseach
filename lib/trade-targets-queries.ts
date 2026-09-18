import "server-only";

import { ALLOWED_TICKERS } from "./queries";
import { getResearchSupabase } from "./supabase-research";
import {
  parseTicker,
  rowToTarget,
  type TradeTarget,
  type TradeTargetInput,
  type TradeTargetRow,
} from "./trade-targets";

const SELECT = "id,ticker,side,amount_type,amount,created_at,updated_at";

const MISSING_TABLE =
  "Tabela trade_targets não existe. Rode supabase/migrations/20260918_trade_targets.sql no SQL Editor do banco Research.";

function throwQueryError(error: { code?: string; message: string }): never {
  if (error.code === "PGRST205") throw new Error(MISSING_TABLE);
  throw new Error(error.message);
}

export async function loadTradeTargets(): Promise<TradeTarget[]> {
  const db = getResearchSupabase();
  const { data, error } = await db
    .from("trade_targets")
    .select(SELECT)
    .order("updated_at", { ascending: false });
  if (error) throwQueryError(error);
  return ((data ?? []) as TradeTargetRow[]).map(rowToTarget);
}

export async function loadTargetTickers(): Promise<string[]> {
  const set = new Set<string>(ALLOWED_TICKERS);
  try {
    const db = getResearchSupabase();
    const { data, error } = await db.from("companies").select("ticker");
    if (error) throw error;
    for (const row of data ?? []) {
      const ticker = parseTicker(row.ticker);
      if (ticker) set.add(ticker);
    }
  } catch {
    // companies pode falhar; a whitelist já cobre o dashboard
  }
  return Array.from(set).sort();
}

export async function upsertTradeTarget(
  input: TradeTargetInput
): Promise<TradeTarget> {
  const db = getResearchSupabase();
  const { data, error } = await db
    .from("trade_targets")
    .upsert(
      {
        ticker: input.ticker,
        side: input.side,
        amount_type: input.amountType,
        amount: input.amount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ticker,side" }
    )
    .select(SELECT)
    .single();
  if (error) throwQueryError(error);
  return rowToTarget(data as TradeTargetRow);
}

export async function deleteTradeTarget(id: string): Promise<void> {
  const db = getResearchSupabase();
  const { error } = await db.from("trade_targets").delete().eq("id", id);
  if (error) throwQueryError(error);
}
