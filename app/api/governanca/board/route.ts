import { NextResponse } from "next/server";
import { loadBoardMembers } from "@/lib/governanca-board-queries";
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
        { error: "Informe ?ticker= (ex.: VALE3)" },
        { status: 400 }
      );
    }

    const members = await loadBoardMembers(ticker);
    return NextResponse.json(members, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/governanca/board]", e);
    const message =
      e instanceof Error ? e.message : "Erro ao carregar conselho";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
