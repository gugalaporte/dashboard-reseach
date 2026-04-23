// Fontes (corretoras) presentes na base hoje.
// Se adicionar nova casa, inclua aqui + em SOURCE_COLORS (research-table.tsx).
export type Fonte = "BTG Pactual" | "Bradesco BBI" | "Safra";

export const FONTES: readonly Fonte[] = [
  "BTG Pactual",
  "Bradesco BBI",
  "Safra",
] as const;

// Linha que vem da view v_research_latest (wide, ja agregada).
export interface ResearchLatestRow {
  empresa: string;
  fonte: Fonte | string;
  data_relatorio: string | null;
  target_price: number | null;
  target_ccy: string | null;
  pe: number | null;
  ev_ebitda: number | null;
  dy: number | null;
  roic: number | null;
  revenue: number | null;
  ebitda: number | null;
  net_debt: number | null;
  net_income: number | null;
}

// Rating vem de stock_guide, juntado no client por (ticker, source_bank).
export interface StockGuideRow {
  ticker: string;
  source_bank: string;
  report_date: string;
  rating: string | null;
  price: number | null;
}

// Linha final consumida pela tabela: view + rating do guide.
export interface ResearchRow extends ResearchLatestRow {
  rating: string | null;
  price: number | null;
}

// Linha bruta de dados_estruturados (drawer).
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
