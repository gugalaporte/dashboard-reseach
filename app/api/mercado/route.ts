import { NextResponse } from "next/server";
import { loadMarketPayload } from "@/lib/mercado-queries";
import { hasResearchServiceKey } from "@/lib/supabase-research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 60;

export async function GET() {
  try {
    if (!hasResearchServiceKey()) {
      return NextResponse.json(
        { error: "SUPABASE_RESEARCH_SERVICE_KEY não configurada." },
        { status: 500 }
      );
    }
    const payload = await loadMarketPayload();
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/mercado]", e);
    const message =
      e instanceof Error ? e.message : "Erro ao carregar painel de mercado";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
