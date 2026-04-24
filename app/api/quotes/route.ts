import { NextResponse } from "next/server";
import { getLiveQuotes } from "@/lib/yahoo-quotes";

// API Route: GET /api/quotes?tickers=AXIA3,PETR4
// Retorna { "AXIA3": {price, currency, asOf}, ... }
// Node runtime (nao Edge): yahoo-finance2 usa cookies/tough-cookie.

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // nunca pre-render

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("tickers") ?? "";

  const tickers = raw
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);

  // Teto defensivo: 100 tickers/request.
  if (tickers.length > 100) {
    return NextResponse.json(
      { error: "too_many_tickers", max: 100 },
      { status: 400 }
    );
  }

  const quotes = await getLiveQuotes(tickers);

  const out: Record<string, { price: number; currency: string; asOf: string }> =
    {};
  for (const [t, q] of quotes) {
    out[t] = { price: q.price, currency: q.currency, asOf: q.asOf };
  }

  return NextResponse.json(out, {
    headers: { "Cache-Control": "no-store" },
  });
}
