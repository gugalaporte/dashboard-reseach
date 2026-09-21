"use client";

import * as React from "react";
import { openLocalPdf } from "@/lib/local-pdf-access";
import { pdfNamesToTry } from "@/lib/pdf-name";
import { cn } from "@/lib/utils";

type Props = {
  pdfId?: number | null;
  fileName?: string | null;
  filePath?: string | null;
  className?: string;
  title?: string;
  children: React.ReactNode;
};

async function namesForPdf(props: Props): Promise<{ fileName: string | null; filePath: string | null }> {
  if (pdfNamesToTry(props.fileName, props.filePath).length > 0) {
    return { fileName: props.fileName ?? null, filePath: props.filePath ?? null };
  }
  if (props.pdfId == null) throw new Error("PDF sem identificador.");
  const res = await fetch(`/api/revisions/pdf?pdf_id=${props.pdfId}&meta=1`, { cache: "no-store" });
  const json = (await res.json()) as { file_name?: string | null; file_path?: string | null; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Falha ao ler o nome do PDF.");
  return { fileName: json.file_name ?? null, filePath: json.file_path ?? null };
}

export function PdfOpenLink({ className, title, children, ...props }: Props) {
  const [busy, setBusy] = React.useState(false);

  async function onClick(e: React.SyntheticEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const names = await namesForPdf(props);
      await openLocalPdf(names.fileName, names.filePath);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (err instanceof Error && err.name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Não foi possível abrir o PDF.";
      window.alert(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") void onClick(e);
      }}
      title={title}
      className={cn("text-left cursor-pointer", busy && "opacity-60 pointer-events-none", className)}
    >
      {children}
    </span>
  );
}
