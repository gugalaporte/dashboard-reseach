import { NextResponse } from "next/server";
import { loadCeoAnalise } from "@/lib/ceo-analise-queries";
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

    const ticker = new URL(req.url).searchParams.get("ticker")?.trim().toUpperCase() ?? "";
    if (!ticker) {
      return NextResponse.json(
        { error: "Informe ?ticker= (ex.: VALE3)" },
        { status: 400 }
      );
    }

    const payload = await loadCeoAnalise(ticker);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/governanca/ceo]", e);
    const message = e instanceof Error ? e.message : "Erro ao carregar CEO";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
