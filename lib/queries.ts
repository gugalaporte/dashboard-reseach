import { supabase } from "./supabase";
import type {
  ResearchLatestRow,
  ResearchRow,
  StockGuideRow,
  MetricaRow,
  PdfDoc,
  PeriodoFilter,
} from "@/types/research";

// Converte filtro textual em data minima (ISO).
// "all" => null (sem filtro).
function periodoToMinDate(p: PeriodoFilter): string | null {
  if (p === "all") return null;
  const days = p === "7d" ? 7 : p === "30d" ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

// Principal: linhas para a tabela do dashboard.
// Faz 2 roundtrips (view + stock_guide) e junta no cliente por (empresa, fonte).
// Obs: junta rating e price do stock_guide mais recente daquela combinacao.
export async function getResearch(params: {
  empresas?: string[];
  fonte?: string;
  periodo?: PeriodoFilter;
}): Promise<ResearchRow[]> {
  const { empresas, fonte, periodo = "all" } = params;
  const minDate = periodoToMinDate(periodo);

  let q = supabase.from("v_research_latest").select("*");
  if (empresas && empresas.length > 0) q = q.in("empresa", empresas);
  if (fonte) q = q.eq("fonte", fonte);
  if (minDate) q = q.gte("data_relatorio", minDate);
  const { data: latest, error } = await q;
  if (error) throw error;

  // Carrega guide para as mesmas empresas (se filtradas) e monta mapa.
  let gq = supabase
    .from("stock_guide")
    .select("ticker, source_bank, report_date, rating, price")
    .order("report_date", { ascending: false });
  if (empresas && empresas.length > 0) gq = gq.in("ticker", empresas);
  const { data: guide, error: gErr } = await gq;
  if (gErr) throw gErr;

  // Mapa (ticker|source_bank) => linha mais recente (primeira ocorrencia por ordering desc).
  const guideMap = new Map<string, StockGuideRow>();
  for (const g of guide ?? []) {
    const key = `${g.ticker}__${g.source_bank}`;
    if (!guideMap.has(key)) guideMap.set(key, g as StockGuideRow);
  }

  const rows: ResearchRow[] = (latest ?? []).map((r: ResearchLatestRow) => {
    const key = `${r.empresa}__${r.fonte}`;
    const g = guideMap.get(key);
    return {
      ...r,
      rating: g?.rating ?? null,
      price: g?.price ?? null,
    };
  });

  return rows;
}

// Lista distinta de empresas para o combobox.
export async function getEmpresas(): Promise<string[]> {
  const { data, error } = await supabase
    .from("v_research_latest")
    .select("empresa");
  if (error) throw error;
  const set = new Set<string>();
  for (const row of data ?? []) set.add(row.empresa);
  return Array.from(set).sort();
}

// Cartoes de resumo no topo do dashboard.
export interface SummaryStats {
  empresasCount: number;
  relatorios30d: number;
  metricasTotal: number;
  ultimaAtualizacao: string | null;
}

export async function getSummaryStats(): Promise<SummaryStats> {
  // Empresas distintas na view
  const { data: latest, error: e1 } = await supabase
    .from("v_research_latest")
    .select("empresa");
  if (e1) throw e1;
  const empresasCount = new Set((latest ?? []).map((r) => r.empresa)).size;

  // pdf_id distintos nos ultimos 30 dias + max data
  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);
  const minIso = d30.toISOString().slice(0, 10);

  const { data: rec, error: e2 } = await supabase
    .from("dados_estruturados")
    .select("pdf_id, data_relatorio")
    .gte("data_relatorio", minIso);
  if (e2) throw e2;
  const pdfSet = new Set<number>();
  for (const r of rec ?? []) if (r.pdf_id != null) pdfSet.add(r.pdf_id);

  // total de metricas (count exato)
  const { count, error: e3 } = await supabase
    .from("dados_estruturados")
    .select("*", { count: "exact", head: true });
  if (e3) throw e3;

  // ultima data de relatorio global
  const { data: last, error: e4 } = await supabase
    .from("dados_estruturados")
    .select("data_relatorio")
    .order("data_relatorio", { ascending: false })
    .limit(1);
  if (e4) throw e4;

  return {
    empresasCount,
    relatorios30d: pdfSet.size,
    metricasTotal: count ?? 0,
    ultimaAtualizacao: last?.[0]?.data_relatorio ?? null,
  };
}

// Drawer: historico completo de uma empresa (todas as metricas e periodos).
export async function getHistoricoEmpresa(empresa: string): Promise<MetricaRow[]> {
  const { data, error } = await supabase
    .from("dados_estruturados")
    .select("empresa, metrica, periodo, valor, unidade, fonte, data_relatorio, pdf_id")
    .eq("empresa", empresa)
    .order("metrica", { ascending: true })
    .order("periodo", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MetricaRow[];
}

// Drawer: PDFs-origem daquela empresa (via pdf_id).
export async function getPdfsEmpresa(empresa: string): Promise<PdfDoc[]> {
  const { data: metricas, error } = await supabase
    .from("dados_estruturados")
    .select("pdf_id")
    .eq("empresa", empresa);
  if (error) throw error;
  const ids = Array.from(
    new Set((metricas ?? []).map((m) => m.pdf_id).filter((x): x is number => x != null))
  );
  if (ids.length === 0) return [];

  const { data: pdfs, error: e2 } = await supabase
    .from("pdf_documents")
    .select("id, file_name, pdf_date")
    .in("id", ids)
    .order("pdf_date", { ascending: false });
  if (e2) throw e2;
  return (pdfs ?? []) as PdfDoc[];
}
