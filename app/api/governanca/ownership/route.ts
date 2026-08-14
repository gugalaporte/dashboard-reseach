import { NextResponse } from "next/server";
import { loadOwnership } from "@/lib/governanca-ownership-queries";
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
        { error: "Informe ?ticker= (ex.: AXIA3)" },
        { status: 400 }
      );
    }

    const payload = await loadOwnership(ticker);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/governanca/ownership]", e);
    const message =
      e instanceof Error ? e.message : "Erro ao carregar composição acionária";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
