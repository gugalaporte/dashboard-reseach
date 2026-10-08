"use client";

import * as React from "react";
import { FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PdfOpenLink } from "@/components/pdf-open-link";
import { formatDateLong } from "@/lib/format";
import type { PdfDoc } from "@/types/research";

const PREVIEW = 10;

function PdfItem({ p }: { p: PdfDoc }) {
  return (
    <PdfOpenLink
      pdfId={p.id}
      fileName={p.file_name}
      title={p.file_name}
      className="flex w-full items-start gap-3 border border-line bg-white p-3 hover:bg-brand/5 transition"
    >
      <FileText className="h-4 w-4 mt-0.5 text-brand shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-ink truncate">{p.file_name}</div>
        <div className="text-[10px] text-ink/50 mt-0.5 font-mono">
          {formatDateLong(p.pdf_date)}
        </div>
      </div>
      <ExternalLink className="h-3.5 w-3.5 mt-0.5 text-ink/35 shrink-0" />
    </PdfOpenLink>
  );
}

type Props = { pdfs: PdfDoc[]; loading: boolean };

/** Mostra os 10 PDFs mais recentes; o restante abre no painel. */
export function EmpresaPdfs({ pdfs, loading }: Props) {
  const [open, setOpen] = React.useState(false);
  const preview = pdfs.slice(0, PREVIEW);
  const hasMore = pdfs.length > PREVIEW;

  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-[0.14em] text-ink/45 mb-3">
        Relatórios (PDF)
      </h3>
      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : pdfs.length === 0 ? (
        <p className="text-sm text-ink/50 border border-line bg-white px-4 py-6 text-center">
          Sem PDFs vinculados.
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {preview.map((p) => (
              <li key={p.id}>
                <PdfItem p={p} />
              </li>
            ))}
          </ul>
          {hasMore && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 h-8 text-[11px] uppercase tracking-[0.08em]"
              onClick={() => setOpen(true)}
            >
              Ver mais ({pdfs.length})
            </Button>
          )}
        </>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="p-0 bg-surface-soft">
          <SheetHeader className="p-5 pr-12">
            <SheetTitle className="font-display text-lg">
              Relatórios (PDF)
            </SheetTitle>
            <p className="text-xs text-ink/50 mt-1">{pdfs.length} arquivos</p>
          </SheetHeader>
          <ul className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-2">
            {pdfs.map((p) => (
              <li key={p.id}>
                <PdfItem p={p} />
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </div>
  );
}
