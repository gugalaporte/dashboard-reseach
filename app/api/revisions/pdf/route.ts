import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeUrlFromPath(rawPath: string): string | null {
  const p = rawPath.trim();
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;

  // Paths legados internos (ex.: /sessions/...) nao sao acessiveis pelo browser.
  if (p.startsWith("/sessions/")) return null;

  // Ja parece endpoint de storage.
  if (p.includes("/storage/v1/object/")) {
    if (p.startsWith("/")) return `${base}${p}`;
    return p;
  }

  return `${base}/storage/v1/object/public/${p.replace(/^\/+/, "")}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pdfId = Number(searchParams.get("pdf_id") ?? "");
    if (!Number.isFinite(pdfId) || pdfId <= 0) {
      return NextResponse.json({ error: "invalid_pdf_id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("pdf_documents")
      .select("id,file_path")
      .eq("id", pdfId)
      .maybeSingle();
    if (error) throw error;
    if (!data?.file_path) {
      return NextResponse.json({ error: "pdf_not_found" }, { status: 404 });
    }

    const url = normalizeUrlFromPath(String(data.file_path));
    if (!url) {
      return NextResponse.json(
        {
          error: "pdf_unavailable",
          message: "Arquivo não disponível por URL pública no momento.",
        },
        { status: 404 }
      );
    }

    return NextResponse.redirect(url, { status: 302 });
  } catch (e) {
    console.error("[api/revisions/pdf]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "pdf_open_failed" },
      { status: 500 }
    );
  }
}

