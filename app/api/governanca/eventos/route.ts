import { NextResponse } from "next/server";
import { loadEventosDaSemana } from "@/lib/governanca-eventos-queries";
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
    const { searchParams } = new URL(req.url);
    const ticker = searchParams.get("ticker");
    const events = await loadEventosDaSemana(ticker);
    return NextResponse.json(events, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/governanca/eventos]", e);
    const message =
      e instanceof Error ? e.message : "Erro ao carregar atualizações";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
