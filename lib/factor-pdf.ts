import { formatDateShort } from "./format";
import type { FactorRow, FactorWeightPct } from "./factor-scoring";
import { formatFactorCell, formatScore } from "./factor-display";

export type FactorPdfOpts = {
  rows: FactorRow[];
  asOfDate: string | null;
  weights: FactorWeightPct;
  sectorLabel: (row: FactorRow) => string;
  includeReason: boolean;
};

export function factorPdfFilename(asOfDate: string | null): string {
  const day = (asOfDate ?? new Date().toISOString()).slice(0, 10);
  return `screening-finacap-${day}.pdf`;
}

export function factorPdfTable(opts: FactorPdfOpts): {
  title: string;
  subtitle: string;
  head: string[];
  body: string[][];
} {
  const head = [
    "Papel",
    "Setor",
    "Quality",
    "Value",
    "Momentum",
    "Carry",
    "Score",
    "Classe",
  ];
  if (opts.includeReason) head.push("Motivo");

  const body = opts.rows.map((r) => {
    const row = [
      r.inPortfolio ? `${r.ticker} *` : r.ticker,
      opts.sectorLabel(r) || "–",
      formatFactorCell(r, "quality"),
      formatFactorCell(r, "value"),
      formatFactorCell(r, "momentum"),
      formatFactorCell(r, "carry"),
      formatScore(r.score),
      r.factorClass ?? "–",
    ];
    if (opts.includeReason) {
      row.push(r.eligible ? "–" : (r.ineligibleReason ?? "Inelegível"));
    }
    return row;
  });

  const asOf = opts.asOfDate ? formatDateShort(opts.asOfDate) : "–";
  const subtitle = `Atualização ${asOf}  ·  Quality ${opts.weights.quality}% · Value ${opts.weights.value}% · Carry ${opts.weights.carry}% · Momentum ${opts.weights.momentum}%  ·  ${opts.rows.length} empresas`;

  return { title: "Screening multifatorial", subtitle, head, body };
}

/** Gera o PDF da tabela visível e dispara o download. */
export async function downloadFactorPdf(opts: FactorPdfOpts): Promise<void> {
  if (opts.rows.length === 0) return;
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;
  const table = factorPdfTable(opts);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  doc.setFontSize(14);
  doc.setTextColor(3, 10, 30);
  doc.text(table.title, 14, 14);
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(table.subtitle, 14, 20);

  autoTable(doc, {
    startY: 24,
    head: [table.head],
    body: table.body,
    styles: { fontSize: 8, cellPadding: 1.6, textColor: [9, 5, 2] },
    headStyles: {
      fillColor: [3, 10, 30],
      textColor: [241, 241, 241],
      fontStyle: "bold",
      fontSize: 7,
    },
    alternateRowStyles: { fillColor: [241, 241, 241] },
    columnStyles: {
      0: { cellWidth: 22, fontStyle: "bold" },
      7: { halign: "center", cellWidth: 16 },
    },
  });

  doc.save(factorPdfFilename(opts.asOfDate));
}
