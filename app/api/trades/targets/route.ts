import { NextResponse } from "next/server";
import { hasResearchServiceKey } from "@/lib/supabase-research";
import { parseTargetInput } from "@/lib/trade-targets";
import {
  deleteTradeTarget,
  loadTargetTickers,
  loadTradeTargets,
  upsertTradeTarget,
} from "@/lib/trade-targets-queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    if (!hasResearchServiceKey()) {
      return fail("SUPABASE_RESEARCH_SERVICE_KEY não configurada.", 500);
    }
    const [targets, tickers] = await Promise.all([
      loadTradeTargets(),
      loadTargetTickers(),
    ]);
    return NextResponse.json(
      { targets, tickers },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[api/trades/targets GET]", e);
    const message = e instanceof Error ? e.message : "Erro ao carregar metas";
    return fail(message, 500);
  }
}

export async function POST(req: Request) {
  try {
    if (!hasResearchServiceKey()) {
      return fail("SUPABASE_RESEARCH_SERVICE_KEY não configurada.", 500);
    }
    const parsed = parseTargetInput(await req.json());
    if (typeof parsed === "string") return fail(parsed, 400);
    const target = await upsertTradeTarget(parsed);
    return NextResponse.json(target, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/trades/targets POST]", e);
    const message = e instanceof Error ? e.message : "Erro ao salvar meta";
    return fail(message, 500);
  }
}

export async function DELETE(req: Request) {
  try {
    if (!hasResearchServiceKey()) {
      return fail("SUPABASE_RESEARCH_SERVICE_KEY não configurada.", 500);
    }
    const id = new URL(req.url).searchParams.get("id")?.trim() ?? "";
    if (!id) return fail("Informe ?id=", 400);
    await deleteTradeTarget(id);
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("[api/trades/targets DELETE]", e);
    const message = e instanceof Error ? e.message : "Erro ao remover meta";
    return fail(message, 500);
  }
}
