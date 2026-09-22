import "server-only";

import { getDailyBars, latestBar } from "./market-history";
import { ALLOWED_TICKERS } from "./queries";
import { getAssetSupabase, hasAssetServiceKey } from "./supabase-asset";
import { getResearchSupabase } from "./supabase-research";
import {
  aggregateExecutions,
  parseMovTradeDate,
  type MovAtivoRow,
} from "./trade-analytics";
import {
  attachMarketMarks,
  attachTargetProgress,
  earliestStart,
  MAURITSSTAD_DESK,
  uniqueTickers,
} from "./trade-target-progress";
import {
  parseTicker,
  rowToTarget,
  type TradeTarget,
  type TradeTargetInput,
  type TradeTargetRow,
} from "./trade-targets";

const SELECT = "id,ticker,side,amount_type,amount,start_date,due_date,created_at,updated_at";

const MISSING_TABLE =
  "Tabela trade_targets não existe. Rode supabase/migrations/20260918_trade_targets.sql no SQL Editor do banco Research.";

function throwQueryError(error: { code?: string; message: string }): never {
  if (error.code === "PGRST205") throw new Error(MISSING_TABLE);
  throw new Error(error.message);
}

const PAGE_SIZE = 1000;

async function loadMauritsstadFills(
  fromIso: string,
  tickers: string[]
): Promise<ReturnType<typeof aggregateExecutions>> {
  if (!hasAssetServiceKey() || tickers.length === 0) return [];

  const sb = getAssetSupabase();
  const rows: MovAtivoRow[] = [];
  let cursor: number | undefined;

  while (true) {
    let query = sb
      .from("mov_ativo")
      .select(
        "id,trade_date,product,amount,price,productclass,book,trader,financialsettle,trading_desk"
      )
      .eq("productclass", "Equity")
      .eq("trading_desk", MAURITSSTAD_DESK)
      .in("product", tickers)
      .order("id", { ascending: false })
      .limit(PAGE_SIZE);

    if (cursor != null) query = query.lt("id", cursor);

    const { data, error } = await query;
    if (error) throw error;

    const batch = (data ?? []) as MovAtivoRow[];
    if (batch.length === 0) break;

    for (const row of batch) {
      const iso = parseMovTradeDate(row.trade_date);
      if (!iso || iso < fromIso) continue;
      rows.push(row);
    }

    cursor = batch[batch.length - 1]!.id;
    if (batch.length < PAGE_SIZE) break;
  }

  return aggregateExecutions(rows);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function loadLastCloses(tickers: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (tickers.length === 0) return out;
  const bars = await getDailyBars(tickers, isoDaysAgo(21), isoDaysAgo(0));
  for (const [ric, list] of bars) {
    const bar = latestBar(list);
    if (bar) out.set(ric, bar.close);
  }
  return out;
}

async function withMauritsstadProgress(targets: TradeTarget[]): Promise<TradeTarget[]> {
  const fromIso = earliestStart(targets);
  const fillTickers = uniqueTickers(targets.filter((t) => t.startDate && t.dueDate));
  let next = targets;
  if (fromIso && fillTickers.length > 0) {
    try {
      const fills = await loadMauritsstadFills(fromIso, fillTickers);
      next = attachTargetProgress(next, fills);
    } catch (err) {
      console.error("[trade-targets] progresso Mauritsstad", err);
    }
  }
  const priceTickers = uniqueTickers(next);
  if (priceTickers.length === 0) return next;
  try {
    const closes = await loadLastCloses(priceTickers);
    return attachMarketMarks(next, closes);
  } catch (err) {
    console.error("[trade-targets] preço atual", err);
    return next;
  }
}

export async function loadTradeTargets(): Promise<TradeTarget[]> {
  const db = getResearchSupabase();
  const { data, error } = await db
    .from("trade_targets")
    .select(SELECT)
    .order("updated_at", { ascending: false });
  if (error) throwQueryError(error);
  return withMauritsstadProgress(((data ?? []) as TradeTargetRow[]).map(rowToTarget));
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
        start_date: input.startDate,
        due_date: input.dueDate,
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
