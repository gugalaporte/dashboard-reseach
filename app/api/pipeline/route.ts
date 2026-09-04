import { NextResponse } from "next/server";
import { loadPipelineNotes } from "@/lib/bottom-up-notes-queries";
import { hasResearchServiceKey } from "@/lib/supabase-research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!hasResearchServiceKey()) {
      return NextResponse.json(
        { error: "SUPABASE_RESEARCH_SERVICE_KEY não configurada." },
        { status: 500 }
      );
    }
    const notes = await loadPipelineNotes();
    return NextResponse.json(notes, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/pipeline]", e);
    const message = e instanceof Error ? e.message : "Erro ao carregar pipeline";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
