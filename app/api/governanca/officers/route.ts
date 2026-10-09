import { NextResponse } from "next/server";
import { loadOfficers } from "@/lib/governanca-officers-queries";
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

    const ticker =
      new URL(req.url).searchParams.get("ticker")?.trim().toUpperCase() ?? "";
    if (!ticker) {
      return NextResponse.json(
        { error: "Informe ?ticker= (ex.: ALOS3)" },
        { status: 400 }
      );
    }

    const officers = await loadOfficers(ticker);
    return NextResponse.json(officers, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/governanca/officers]", e);
    const message =
      e instanceof Error ? e.message : "Erro ao carregar diretores";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
