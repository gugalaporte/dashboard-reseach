import { NextResponse } from "next/server";
import { loadResultados } from "@/lib/governanca-calendario-queries";
import { hasAssetServiceKey } from "@/lib/supabase-asset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!hasAssetServiceKey()) {
      return NextResponse.json(
        { error: "SUPABASE_ASSET_URL / SUPABASE_ASSET_SERVICE_KEY não configuradas." },
        { status: 500 }
      );
    }

    const events = await loadResultados();
    return NextResponse.json(events, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/governanca/resultados]", e);
    const message =
      e instanceof Error ? e.message : "Erro ao carregar calendário";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
