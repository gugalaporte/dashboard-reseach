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
  attachFundNav,
  attachMarketMarks,
  attachTargetProgress,
  earliestStart,
  uniqueTickers,
} from "./trade-target-progress";
import {
  EXTRA_TARGET_TICKERS,
  parseTicker,
  rowToTarget,
  type TradeTarget,
  type TradeTargetInput,
  type TradeTargetRow,
} from "./trade-targets";

const SELECT_BASE = "id,ticker,side,amount_type,amount,start_date,due_date,created_at,updated_at";
const SELECT = `${SELECT_BASE},desk`;

const MISSING_TABLE =
  "Tabela trade_targets não existe. Rode supabase/migrations/20260918_trade_targets.sql no SQL Editor do banco Research.";

const MISSING_DESK =
  "Falta a coluna do fundo. Rode supabase/migrations/20261111_trade_targets_desk.sql no SQL Editor do banco Research.";

const MISSING_PCT =
  "Falta o tipo porcentagem. Rode supabase/migrations/20261111_trade_targets_pct.sql no SQL Editor do banco Research.";

function missingDesk(error: { code?: string; message: string }): boolean {
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    /on conflict specification/i.test(error.message) ||
    /column ["']?desk["']?/i.test(error.message)
  );
}

function throwQueryError(error: { code?: string; message: string }): never {
  if (error.code === "PGRST205") throw new Error(MISSING_TABLE);
  if (missingDesk(error)) throw new Error(MISSING_DESK);
  if (error.code === "23514" && /amount_type/i.test(error.message)) throw new Error(MISSING_PCT);
  throw new Error(error.message);
}

const PAGE_SIZE = 1000;

/** DOLA11 e outros ETFs entram como "ETF BR", não como Equity. */
const FILL_CLASSES = ["Equity", "ETF BR"];

async function loadDeskFills(
  desk: string,
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
      .in("productclass", FILL_CLASSES)
      .eq("trading_desk", desk)
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

  return aggregateExecutions(rows, { productClasses: FILL_CLASSES });
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** valdate do PL vem como MM/DD/YYYY. */
function parseNavDate(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function loadLatestNav(desks: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!hasAssetServiceKey() || desks.length === 0) return out;
  const sb = getAssetSupabase();
  await Promise.all(
    desks.map(async (desk) => {
      const { data, error } = await sb
        .from("historical_nav_share")
        .select("valdate,nav")
        .eq("tradingdesk", desk)
        .order("id", { ascending: false })
        .limit(20);
      if (error) throw error;
      let bestIso = "";
      let bestNav = 0;
      for (const row of data ?? []) {
        const iso = parseNavDate(String(row.valdate ?? ""));
        const nav = Number(row.nav);
        if (!iso || !(nav > 0) || iso <= bestIso) continue;
        bestIso = iso;
        bestNav = nav;
      }
      if (bestNav > 0) out.set(desk.trim().toUpperCase(), bestNav);
    })
  );
  return out;
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
  const pctDesks = [...new Set(targets.filter((t) => t.amountType === "pct").map((t) => t.desk))];
  let navByDesk = new Map<string, number>();
  if (pctDesks.length > 0) {
    try {
      navByDesk = await loadLatestNav(pctDesks);
    } catch (err) {
      console.error("[trade-targets] PL do fundo", err);
    }
  }
  let next = attachFundNav(targets, navByDesk);
  if (fromIso && fillTickers.length > 0) {
    try {
      const desks = [...new Set(targets.map((t) => t.desk))];
      const pages = await Promise.all(desks.map((desk) => loadDeskFills(desk, fromIso, fillTickers)));
      next = attachTargetProgress(next, pages.flat(), navByDesk);
    } catch (err) {
      console.error("[trade-targets] progresso do fundo", err);
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
  const first = await db
    .from("trade_targets")
    .select(SELECT)
    .order("updated_at", { ascending: false });
  if (first.error && missingDesk(first.error)) {
    const second = await db
      .from("trade_targets")
      .select(SELECT_BASE)
      .order("updated_at", { ascending: false });
    if (second.error) throwQueryError(second.error);
    return withMauritsstadProgress(((second.data ?? []) as TradeTargetRow[]).map(rowToTarget));
  }
  if (first.error) throwQueryError(first.error);
  return withMauritsstadProgress(((first.data ?? []) as TradeTargetRow[]).map(rowToTarget));
}

export async function loadTargetTickers(): Promise<string[]> {
  const set = new Set<string>([...ALLOWED_TICKERS, ...EXTRA_TARGET_TICKERS]);
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
        desk: input.desk,
        amount_type: input.amountType,
        amount: input.amount,
        start_date: input.startDate,
        due_date: input.dueDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ticker,side,desk" }
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
