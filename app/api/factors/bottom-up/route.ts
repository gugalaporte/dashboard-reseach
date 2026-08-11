import { NextResponse } from "next/server";
import { loadBottomUp } from "@/lib/bottom-up-queries";
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
        { error: "Informe ?ticker= (ex.: POMO3)" },
        { status: 400 }
      );
    }

    const payload = await loadBottomUp(ticker);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/factors/bottom-up]", e);
    const message =
      e instanceof Error
        ? e.message
        : e &&
            typeof e === "object" &&
            "message" in e &&
            typeof (e as { message: unknown }).message === "string"
          ? (e as { message: string }).message
          : "Erro ao carregar bottom-up";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
