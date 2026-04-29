import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApiRevision = {
  event_date: string;
  ticker: string;
  empresa: string | null;
  sector: string | null;
  fonte: string;
  pdf_id: number | null;
  prev_pdf_id: number | null;
  prev_report_date: string | null;
  event_type: "tp_change" | "rating_change" | "rating_and_tp_change" | "new_coverage";
  prev_rating: string | null;
  rating: string | null;
  prev_target_price: number | null;
  target_price: number | null;
  tp_change_pct: number | null;
  tp_direction: "raise" | "cut" | "hold" | null;
  rating_direction: "upgrade" | "downgrade" | "lateral" | "hold" | null;
  current_file_path: string | null;
  previous_file_path: string | null;
};

function parsePeriodToDays(period: string | null): number {
  if (period === "24h") return 1;
  if (period === "7d") return 7;
  if (period === "365d") return 365;
  if (period === "90d") return 90;
  if (period && /^\d+d$/.test(period)) return Math.max(1, Number(period.replace("d", "")));
  return 30;
}

function parseCsvParam(v: string | null): string[] {
  return (v ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function byDateThenMagnitude(a: ApiRevision, b: ApiRevision): number {
  const da = (a.event_date ?? "").slice(0, 10);
  const db = (b.event_date ?? "").slice(0, 10);
  if (da !== db) return db.localeCompare(da);
  return Math.abs(b.tp_change_pct ?? 0) - Math.abs(a.tp_change_pct ?? 0);
}

function isRelevant(r: ApiRevision): boolean {
  if (r.target_price == null) return false;
  if (r.event_type === "tp_change" && Math.abs(r.tp_change_pct ?? 0) < 1) return false;
  return true;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parsePeriodToDays(searchParams.get("period"));
    const fontes = parseCsvParam(searchParams.get("fontes"));
    const tipos = parseCsvParam(searchParams.get("tipos"));
    const kind = (searchParams.get("kind") ?? "all").trim();
    const ticker = (searchParams.get("ticker") ?? "").trim().toUpperCase();
    const fonte = (searchParams.get("fonte") ?? "").trim();
    const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? "100"), 1), 300);

    const minDate = new Date();
    minDate.setDate(minDate.getDate() - days);
    const minIso = minDate.toISOString().slice(0, 10);

    const baseSelect =
      "event_date,ticker,empresa,sector,fonte,pdf_id,prev_pdf_id,prev_report_date," +
      "event_type,prev_rating,rating,prev_target_price,target_price,tp_change_pct,tp_direction,rating_direction";
    let q = supabase
      .from("v_revisions")
      .select(baseSelect)
      .gte("event_date", minIso)
      .not("target_price", "is", null)
      .limit(500);

    if (fontes.length > 0) q = q.in("fonte", fontes);
    if (tipos.length > 0) q = q.in("event_type", tipos);
    if (ticker) q = q.eq("ticker", ticker);
    if (fonte) q = q.eq("fonte", fonte);

    const { data, error } = await q;
    if (error) throw error;

    const rows = ((data ?? []) as unknown as ApiRevision[])
      .filter(isRelevant)
      .filter((r) => {
        if (kind === "tp_raise") {
          return (
            (r.event_type === "tp_change" || r.event_type === "rating_and_tp_change") &&
            r.tp_direction === "raise"
          );
        }
        if (kind === "tp_cut") {
          return (
            (r.event_type === "tp_change" || r.event_type === "rating_and_tp_change") &&
            r.tp_direction === "cut"
          );
        }
        if (kind === "rating") {
          return r.event_type === "rating_change" || r.event_type === "rating_and_tp_change";
        }
        return true;
      })
      .sort(byDateThenMagnitude);
    const sliced = rows.slice(0, limit);

    const pdfIds = Array.from(
      new Set(
        sliced.flatMap((r) => [r.pdf_id, r.prev_pdf_id]).filter((x): x is number => x != null)
      )
    );
    const pdfById = new Map<number, string | null>();
    if (pdfIds.length > 0) {
      const { data: pdfs, error: e2 } = await supabase
        .from("pdf_documents")
        .select("id,file_path")
        .in("id", pdfIds);
      if (e2) throw e2;
      for (const p of pdfs ?? []) pdfById.set(p.id as number, (p.file_path as string | null) ?? null);
    }

    const out = sliced.map((r) => ({
      ...r,
      current_file_path: r.pdf_id != null ? (pdfById.get(r.pdf_id) ?? null) : null,
      previous_file_path: r.prev_pdf_id != null ? (pdfById.get(r.prev_pdf_id) ?? null) : null,
    }));

    return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[api/revisions]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "revisions_failed" },
      { status: 500 }
    );
  }
}

