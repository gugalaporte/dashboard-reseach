import { NextResponse } from "next/server";
import { loadInsiderTrades } from "@/lib/insider-trades-queries";
import { hasResearchServiceKey } from "@/lib/supabase-research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    if (!hasResearchServiceKey()) {
      return NextResponse.json(
        { error: "SUPABASE_RESEARCH_SERVICE_KEY não configurada." },
        { status: 500 }
      );
    }
    const month = new URL(req.url).searchParams.get("month");
    const payload = await loadInsiderTrades(month);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/governanca/insider]", e);
    const message = e instanceof Error ? e.message : "Erro ao carregar insider trade";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
