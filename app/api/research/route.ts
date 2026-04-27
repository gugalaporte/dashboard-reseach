import { NextResponse } from "next/server";
import {
  buildRows,
  collectYahooReportClosePairs,
  loadResearchRaw,
} from "@/lib/queries";
import { batchGetClosesForReportDates } from "@/lib/yahoo-quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Monta ResearchRow[] no servidor: Supabase + fechamentos Yahoo para EPS/NI sem price no guide.
export async function GET() {
  try {
    const { metrics, guide } = await loadResearchRaw();
    const pairs = collectYahooReportClosePairs(guide);
    let yahooMap = new Map<string, number>();
    if (pairs.length > 0) {
      yahooMap = await batchGetClosesForReportDates(pairs);
    }
    const rows = buildRows(metrics, guide, yahooMap);
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/research]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "research_failed" },
      { status: 500 }
    );
  }
}
