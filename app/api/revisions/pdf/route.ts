import { createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { findLocalPdf, pdfBaseName, reportsRoot } from "@/lib/sell-side-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function missingHtml(file: string | null): NextResponse {
  const name = file ?? "(sem nome)";
  const root = reportsRoot();
  const html = `<!doctype html>
<meta charset="utf-8">
<title>PDF não encontrado</title>
<body style="font-family:sans-serif;padding:2rem;color:#1a1a1a">
  <p>Não achei <strong>${escapeHtml(name)}</strong> em:</p>
  <p style="font-size:13px;color:#555">${escapeHtml(root)}</p>
  <p style="font-size:13px;color:#555">Confira se o arquivo está na pasta do banco (btg, bradesco, itaú, safra) com o mesmo nome do banco de dados.</p>
</body>`;
  return new NextResponse(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pdfId = Number(searchParams.get("pdf_id") ?? "");
    const fonte = (searchParams.get("fonte") ?? "").trim() || null;
    if (!Number.isFinite(pdfId) || pdfId <= 0) {
      return NextResponse.json({ error: "invalid_pdf_id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("pdf_documents")
      .select("id,file_name,file_path")
      .eq("id", pdfId)
      .maybeSingle();
    if (error) throw error;

    const fileName = (data?.file_name as string | null) ?? null;
    const filePath = (data?.file_path as string | null) ?? null;
    const base = pdfBaseName(fileName, filePath);
    const abs = findLocalPdf({ fileName, filePath, fonte });
    if (!abs) return missingHtml(base);

    const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream;
    const filename = path.basename(abs);
    const ascii = filename.replace(/[^\x20-\x7E]/g, "_");
    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[api/revisions/pdf]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "pdf_open_failed" },
      { status: 500 }
    );
  }
}
