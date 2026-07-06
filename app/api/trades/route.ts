import { NextResponse } from "next/server";
import { getAssetSupabase } from "@/lib/supabase-asset";
import { getDailyBars } from "@/lib/market-history";
import {
  aggregateExecutions,
  buildRotationBuckets,
  enrichExecutions,
  excludeStockConversions,
  IBOV_RIC,
  latestEquityTradeIso,
  parseMovTradeDate,
  summaryStats,
  type MovAtivoRow,
} from "@/lib/trade-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PAGE_SIZE = 1000;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function loadEquityTrades(fromIso: string): Promise<MovAtivoRow[]> {
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

  return rows;
}

async function fetchLatestEquityTradeIso(): Promise<string | null> {
  const sb = getAssetSupabase();
  const { data, error } = await sb
    .from("mov_ativo")
    .select("trade_date,product,productclass")
    .eq("productclass", "Equity")
    .order("id", { ascending: false })
    .limit(500);
  if (error) throw error;
  return latestEquityTradeIso((data ?? []) as MovAtivoRow[]);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(365, Math.max(7, Number(searchParams.get("days") ?? 90)));

    const fromIso = isoDaysAgo(days);
    const toIso = isoDaysAgo(0);

    const raw = await loadEquityTrades(fromIso);
    const latestTradeIso =
      latestEquityTradeIso(raw) ?? (await fetchLatestEquityTradeIso());
    const base = excludeStockConversions(aggregateExecutions(raw));
    const rics = [...new Set(base.map((e) => e.ric))];

    const barsByRic = await getDailyBars([...rics, IBOV_RIC], fromIso, toIso);
    const executions = enrichExecutions(base, barsByRic);
    const ibovBars = barsByRic.get(IBOV_RIC) ?? [];
    const rotationBuckets = buildRotationBuckets(executions, barsByRic, ibovBars);

    const tradingDesks = [
      ...new Set(executions.map((e) => e.tradingDesk).filter((d) => d && d !== "—")),
    ].sort();

    return NextResponse.json(
      {
        fromIso,
        toIso,
        tradingDesks,
        executions: executions.sort((a, b) => b.tradeDateIso.localeCompare(a.tradeDateIso)),
        rotationBuckets,
        summary: summaryStats(executions),
        latestTradeIso,
        priceSource: barsByRic.size > 0 ? "supabase+yahoo" : "yahoo",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[api/trades]", err);
    const message = err instanceof Error ? err.message : "Erro ao carregar trades";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
