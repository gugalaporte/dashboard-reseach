import { NextResponse } from "next/server";
import { loadFactorRanking } from "@/lib/factor-queries";
import {
  DEFAULT_ELIGIBILITY,
  sanitizeWeightPct,
} from "@/lib/factor-scoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readPct(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);
  if (raw == null || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const minVol = Number(searchParams.get("minDayVolume"));
    const maxNd = Number(searchParams.get("maxNetDebtEbitda"));

    const eligibility = {
      minDayVolume: Number.isFinite(minVol) && minVol >= 0
        ? minVol
        : DEFAULT_ELIGIBILITY.minDayVolume,
      maxNetDebtEbitda: Number.isFinite(maxNd) && maxNd > 0
        ? maxNd
        : DEFAULT_ELIGIBILITY.maxNetDebtEbitda,
    };

    const weights = sanitizeWeightPct({
      quality: readPct(searchParams, "wQuality"),
      value: readPct(searchParams, "wValue"),
      carry: readPct(searchParams, "wCarry"),
      momentum: readPct(searchParams, "wMomentum"),
    });

    const payload = await loadFactorRanking(eligibility, weights);
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/factors]", e);
    const message =
      e instanceof Error
        ? e.message
        : e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
          ? (e as { message: string }).message
          : "Erro ao carregar Factor Investing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
