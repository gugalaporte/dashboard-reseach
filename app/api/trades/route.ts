import { NextResponse } from "next/server";
import { getAssetSupabase } from "@/lib/supabase-asset";
import { getDailyBars } from "@/lib/market-history";
import {
  aggregateExecutions,
  buildRotationRows,
  enrichExecutions,
  IBOV_RIC,
  parseMovTradeDate,
  summaryStats,
  type MovAtivoRow,
} from "@/lib/trade-analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 1000;

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function loadEquityTrades(fromIso: string): Promise<MovAtivoRow[]> {
  const sb = getAssetSupabase();
  const rows: MovAtivoRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await sb
      .from("mov_ativo")
      .select(
        "id,trade_date,product,amount,price,productclass,book,trader,financialsettle,trading_desk"
      )
      .eq("productclass", "Equity")
      .order("id", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;
    const batch = (data ?? []) as MovAtivoRow[];
    if (batch.length === 0) break;

    let anyInRange = false;
    for (const row of batch) {
      const iso = parseMovTradeDate(row.trade_date);
      if (!iso || iso < fromIso) continue;
      rows.push(row);
      anyInRange = true;
    }

    if (!anyInRange) break;
    if (batch.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return rows;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(365, Math.max(7, Number(searchParams.get("days") ?? 90)));

    const fromIso = isoDaysAgo(days);
    const toIso = new Date().toISOString().slice(0, 10);

    const raw = await loadEquityTrades(fromIso);
    const base = aggregateExecutions(raw);
    const rics = [...new Set(base.map((e) => e.ric))];

    const barsByRic = await getDailyBars([...rics, IBOV_RIC], fromIso, toIso);
    const executions = enrichExecutions(base, barsByRic);
    const rotations = buildRotationRows(
      executions,
      barsByRic,
      barsByRic.get(IBOV_RIC) ?? []
    );

    const tradingDesks = [
      ...new Set(executions.map((e) => e.tradingDesk).filter((d) => d && d !== "—")),
    ].sort();

    return NextResponse.json(
      {
        fromIso,
        toIso,
        tradingDesks,
        executions: executions.sort((a, b) => b.tradeDateIso.localeCompare(a.tradeDateIso)),
        rotations,
        performance: rotations,
        summary: summaryStats(executions),
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
