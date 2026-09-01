import { NextResponse } from "next/server";
import { loadAllLsegViewRows } from "@/lib/lseg-queries";
import { hasResearchServiceKey } from "@/lib/supabase-research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    if (!hasResearchServiceKey()) {
      return NextResponse.json(
        {
          error:
            "SUPABASE_RESEARCH_SERVICE_KEY não configurada — necessária para ler tabelas LSEG.",
        },
        { status: 500 }
      );
    }
    const rows = await loadAllLsegViewRows();
    return NextResponse.json(rows, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/lseg]", e);
    const message =
      e instanceof Error
        ? e.message
        : e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
          ? (e as { message: string }).message
          : "Erro ao carregar dados LSEG";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
