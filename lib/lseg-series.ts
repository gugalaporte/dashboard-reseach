import "server-only";

import { getResearchSupabase } from "./supabase-research";

export type LsegSeriesPoint = {
  as_of_date: string;
  price: number | null;
  last_price: number | null;
  price_close: number | null;
  ret_1m: number | null;
  ret_3m: number | null;
  ret_6m: number | null;
  ret_ytd: number | null;
  ret_1y: number | null;
  total_return: number | null;
  day_volume: number | null;
  price_52w_high: number | null;
  price_52w_low: number | null;
  enterprise_value: number | null;
  net_debt: number | null;
  wacc: number | null;
  gross_margin: number | null;
  ebitda_margin: number | null;
  current_ratio: number | null;
  quick_ratio: number | null;
  price_target_high: number | null;
  price_target_low: number | null;
  price_target_median: number | null;
  range_pct: number | null;
};

export type LsegSeriesPayload = {
  ticker: string;
  ric: string;
  points: LsegSeriesPoint[];
};

const SERIES_SELECT = [
  "as_of_date",
  "last_price",
  "price_close",
  "ret_1m",
  "ret_3m",
  "ret_6m",
  "ret_ytd",
  "ret_1y",
  "total_return",
  "day_volume",
  "price_52w_high",
  "price_52w_low",
  "enterprise_value",
  "net_debt",
  "wacc",
  "gross_margin",
  "ebitda_margin",
  "current_ratio",
  "quick_ratio",
  "price_target_high",
  "price_target_low",
  "price_target_median",
].join(",");

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toMillions(v: unknown): number | null {
  const n = num(v);
  if (n == null) return null;
  return Math.abs(n) >= 1_000_000 ? n / 1_000_000 : n;
}

function rangePct(
  price: number | null,
  high: number | null,
  low: number | null
): number | null {
  if (price == null || high == null || low == null) return null;
  const span = high - low;
  if (!(span > 0)) return null;
  return ((price - low) / span) * 100;
}

/** Resolve RIC a partir do ticker B3 (ex.: PETR4 → PETR4.SA). */
export async function resolveRicForTicker(ticker: string): Promise<string> {
  const t = ticker.trim().toUpperCase();
  const db = getResearchSupabase();
  const { data, error } = await db
    .from("companies")
    .select("ric")
    .eq("ticker", t)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data?.ric) return String(data.ric);
  return `${t}.SA`;
}

/** Série diária de um único ticker (as_of_date ASC). */
export async function loadLsegSeries(ticker: string): Promise<LsegSeriesPayload> {
  const t = ticker.trim().toUpperCase();
  if (!t) throw new Error("Ticker obrigatório");

  const ric = await resolveRicForTicker(t);
  const db = getResearchSupabase();

  const { data, error } = await db
    .from("daily_snapshot")
    .select(SERIES_SELECT)
    .eq("ric", ric)
    .order("as_of_date", { ascending: true });

  if (error) throw error;

  const points: LsegSeriesPoint[] = [];
  for (const row of data ?? []) {
    const asOf = String((row as { as_of_date?: string }).as_of_date ?? "").slice(0, 10);
    if (!asOf) continue;

    const last = num((row as { last_price?: unknown }).last_price);
    const close = num((row as { price_close?: unknown }).price_close);
    const price = close ?? last;
    const high = num((row as { price_52w_high?: unknown }).price_52w_high);
    const low = num((row as { price_52w_low?: unknown }).price_52w_low);

    points.push({
      as_of_date: asOf,
      price,
      last_price: last,
      price_close: close,
      ret_1m: num((row as { ret_1m?: unknown }).ret_1m),
      ret_3m: num((row as { ret_3m?: unknown }).ret_3m),
      ret_6m: num((row as { ret_6m?: unknown }).ret_6m),
      ret_ytd: num((row as { ret_ytd?: unknown }).ret_ytd),
      ret_1y: num((row as { ret_1y?: unknown }).ret_1y),
      total_return: num((row as { total_return?: unknown }).total_return),
      day_volume: num((row as { day_volume?: unknown }).day_volume),
      price_52w_high: high,
      price_52w_low: low,
      enterprise_value: toMillions((row as { enterprise_value?: unknown }).enterprise_value),
      net_debt: toMillions((row as { net_debt?: unknown }).net_debt),
      wacc: num((row as { wacc?: unknown }).wacc),
      gross_margin: num((row as { gross_margin?: unknown }).gross_margin),
      ebitda_margin: num((row as { ebitda_margin?: unknown }).ebitda_margin),
      current_ratio: num((row as { current_ratio?: unknown }).current_ratio),
      quick_ratio: num((row as { quick_ratio?: unknown }).quick_ratio),
      price_target_high: num((row as { price_target_high?: unknown }).price_target_high),
      price_target_low: num((row as { price_target_low?: unknown }).price_target_low),
      price_target_median: num((row as { price_target_median?: unknown }).price_target_median),
      range_pct: rangePct(price, high, low),
    });
  }

  return { ticker: t, ric, points };
}
