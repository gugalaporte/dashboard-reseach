import { NextResponse } from "next/server";
import { loadB3Turnover } from "@/lib/b3-turnover-queries";
import { volumeChartFrom } from "@/lib/trade-volume";
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
    const rawDays = searchParams.get("days") ?? "90";
    const allHistory = rawDays === "all";
    const days = allHistory
      ? null
      : Math.min(365, Math.max(7, Number(rawDays) || 90));

    const toIso = isoDaysAgo(0);
    const chartFrom = volumeChartFrom(toIso);
    // Tabelas usam o período; os gráficos precisam da janela (sem out/24).
    const periodFrom = allHistory ? "2024-11-01" : isoDaysAgo(days!);
    const requestedFrom = periodFrom < chartFrom ? periodFrom : chartFrom;

    const raw = await loadEquityTrades(requestedFrom);
    const latestTradeIso =
      latestEquityTradeIso(raw) ?? (await fetchLatestEquityTradeIso());
    const base = excludeStockConversions(aggregateExecutions(raw));
    const fromIso =
      base.reduce<string | null>(
        (min, e) => (!min || e.tradeDateIso < min ? e.tradeDateIso : min),
        null
      ) ?? requestedFrom;
    const rics = [...new Set(base.map((e) => e.ric))];

    const barsFromIso = fromIso < isoDaysAgo(365) ? isoDaysAgo(365) : fromIso;
    const barsByRic = await getDailyBars([...rics, IBOV_RIC], barsFromIso, toIso);
    const executions = enrichExecutions(base, barsByRic);
    const ibovBars = barsByRic.get(IBOV_RIC) ?? [];
    const rotationBuckets = buildRotationBuckets(executions, barsByRic, ibovBars);

    const tradingDesks = [
      ...new Set(executions.map((e) => e.tradingDesk).filter((d) => d && d !== "—")),
    ].sort();

    let b3Turnover: Awaited<ReturnType<typeof loadB3Turnover>> = [];
    try {
      b3Turnover = await loadB3Turnover(chartFrom, toIso);
    } catch (err) {
      console.error("[api/trades] B3.TURNOVER", err);
    }

    return NextResponse.json(
      {
        fromIso,
        toIso,
        tradingDesks,
        executions: executions.sort((a, b) => b.tradeDateIso.localeCompare(a.tradeDateIso)),
        rotationBuckets,
        b3Turnover,
        b3FromIso: chartFrom,
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
