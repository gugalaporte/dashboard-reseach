import "server-only";
import YahooFinance from "yahoo-finance2";
import { supabase } from "@/lib/supabase";
import type { DailyBar } from "@/lib/trade-analytics";
import { barOnDate, latestBar } from "@/lib/trade-analytics";

export type { DailyBar };
export { barOnDate, latestBar };

type PriceRow = {
  ric: string;
  trade_date: string;
  open: number | string | null;
  high: number | string | null;
  low: number | string | null;
  close: number | string | null;
  volume: number | string | null;
};

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
const HIST_CACHE = new Map<string, { bars: DailyBar[]; expires: number }>();
const HIST_TTL_MS = 6 * 60 * 60 * 1000;

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toIsoDate(d: unknown): string {
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const dt = d instanceof Date ? d : new Date(String(d));
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

function rowToBar(row: PriceRow): DailyBar | null {
  const close = num(row.close);
  const high = num(row.high);
  const low = num(row.low);
  const open = num(row.open);
  const tradeDate = toIsoDate(row.trade_date);
  if (!tradeDate || close == null) return null;
  const h = high ?? close;
  const l = low ?? close;
  const o = open ?? close;
  return {
    ric: row.ric,
    tradeDate,
    open: o,
    high: h,
    low: l,
    close,
    volume: num(row.volume) ?? 0,
    typicalPrice: (h + l + close) / 3,
  };
}

function yahooSymbol(ric: string): string {
  if (ric.startsWith("^")) return ric;
  return ric.includes(".") ? ric : `${ric}.SA`;
}

async function fetchFromSupabase(
  rics: string[],
  fromIso: string,
  toIso: string
): Promise<Map<string, DailyBar[]>> {
  const out = new Map<string, DailyBar[]>();
  if (rics.length === 0) return out;

  const { data, error } = await supabase
    .from("price_history_daily")
    .select("ric,trade_date,open,high,low,close,volume")
    .in("ric", rics)
    .gte("trade_date", fromIso)
    .lte("trade_date", toIso)
    .order("trade_date", { ascending: true });

  if (error) {
    console.warn("[market-history] Supabase:", error.message);
    return out;
  }

  for (const row of (data ?? []) as PriceRow[]) {
    const bar = rowToBar(row);
    if (!bar) continue;
    const list = out.get(bar.ric) ?? [];
    list.push(bar);
    out.set(bar.ric, list);
  }
  return out;
}

async function fetchFromYahoo(
  ric: string,
  fromIso: string,
  toIso: string
): Promise<DailyBar[]> {
  const cacheKey = `${ric}|${fromIso}|${toIso}`;
  const hit = HIST_CACHE.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.bars;

  const start = new Date(fromIso + "T12:00:00.000Z");
  const end = new Date(toIso + "T12:00:00.000Z");
  end.setUTCDate(end.getUTCDate() + 5);

  try {
    const chart = (await yahooFinance.chart(yahooSymbol(ric), {
      period1: start,
      period2: end,
      interval: "1d",
    })) as {
      quotes?: Array<{
        date?: unknown;
        open?: unknown;
        high?: unknown;
        low?: unknown;
        close?: unknown;
        volume?: unknown;
      }>;
    };

    const bars: DailyBar[] = [];
    for (const q of chart.quotes ?? []) {
      const bar = rowToBar({
        ric,
        trade_date: toIsoDate(q.date),
        open: num(q.open),
        high: num(q.high),
        low: num(q.low),
        close: num(q.close),
        volume: num(q.volume),
      });
      if (!bar || bar.tradeDate < fromIso || bar.tradeDate > toIso) continue;
      bars.push(bar);
    }

    HIST_CACHE.set(cacheKey, { bars, expires: Date.now() + HIST_TTL_MS });
    return bars;
  } catch (err) {
    console.error("[market-history] Yahoo", ric, err);
    return [];
  }
}

/** Busca OHLC diário: Supabase primeiro, Yahoo como fallback. */
export async function getDailyBars(
  rics: string[],
  fromIso: string,
  toIso: string
): Promise<Map<string, DailyBar[]>> {
  const unique = [...new Set(rics.map((r) => r.trim().toUpperCase()).filter(Boolean))];
  const supa = await fetchFromSupabase(unique, fromIso, toIso);
  const out = new Map<string, DailyBar[]>();

  const missing: string[] = [];
  for (const ric of unique) {
    const bars = supa.get(ric) ?? [];
    if (bars.length > 0) out.set(ric, bars);
    else missing.push(ric);
  }

  const BATCH = 4;
  for (let i = 0; i < missing.length; i += BATCH) {
    const slice = missing.slice(i, i + BATCH);
    const rows = await Promise.all(
      slice.map(async (ric) => ({ ric, bars: await fetchFromYahoo(ric, fromIso, toIso) }))
    );
    for (const { ric, bars } of rows) {
      if (bars.length > 0) out.set(ric, bars);
    }
  }

  return out;
}

export function barOnOrAfter(bars: DailyBar[], isoDate: string): DailyBar | null {
  return bars.find((b) => b.tradeDate >= isoDate) ?? null;
}
