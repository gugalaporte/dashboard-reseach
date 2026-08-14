import { NextResponse } from "next/server";
import { loadRemuneracao } from "@/lib/governanca-remuneracao-queries";
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
    const ticker = (searchParams.get("ticker") ?? "").trim().toUpperCase();
    if (!ticker) {
      return NextResponse.json(
        { error: "Informe ?ticker= (ex.: ALOS3)" },
        { status: 400 }
      );
    }

    const payload = await loadRemuneracao(ticker);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/governanca/remuneracao]", e);
    const message =
      e instanceof Error ? e.message : "Erro ao carregar remuneração";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
