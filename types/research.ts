// Tipos usados apenas pelo drawer (historico bruto + PDFs).
// Tipos do dashboard (Cell, ResearchRow, Fonte, FONTES) estao em lib/queries.ts.

export interface MetricaRow {
  empresa: string;
  metrica: string;
  periodo: string;
  valor: number | null;
  unidade: string | null;
  fonte: string;
  data_relatorio: string;
  pdf_id: number | null;
}

export interface PdfDoc {
  id: number;
  file_name: string;
  pdf_date: string | null;
}

export type PeriodoFilter = "7d" | "30d" | "90d" | "all";
