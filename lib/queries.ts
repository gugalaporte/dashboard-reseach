import { supabase } from "./supabase";
import type { MetricaRow, PdfDoc } from "@/types/research";

// Fontes (corretoras) presentes na base.
export const FONTES = ["BTG Pactual", "Bradesco BBI", "Safra"] as const;
export type Fonte = (typeof FONTES)[number];

// Whitelist de tickers exibidos no dashboard.
// Qualquer empresa fora desta lista nao aparece na tabela nem nos filtros.
export const ALLOWED_TICKERS = [
  "PETR4", "SLCE3", "VBBR3", "GOAU3", "DXCO3", "GOAU4", "SUZB3", "VALE3",
  "POSI3", "RAPT3", "LOGG3", "LREN3", "POMO3", "AZUL", "RAPT4", "ALOS3",
  "POMO4", "MRVE3", "BRBI11", "ITUB4", "PSSA3", "ITUB3", "INBR32", "CMIG4",
  "TIMS3", "EQTL3", "AXIA3", "ENGI11", "AXIA7", "VIVT3", "AXIA6",
] as const;

// Celula generica de metrica: valor + metadados de origem.
export type Cell = {
  value: number;
  date: string | null;
  periodo?: string | null;
  unidade?: string | null;
  pdf_id?: number | null;
};

// Linha consumida pela tabela. Cada metrica vira uma celula opcional.
export type ResearchRow = {
  empresa: string;
  fonte: Fonte;
  rating?: { value: string; date: string | null };
  price?: { value: number; date: string | null };
  target?: Cell & { ccy: string };
  pe?: Cell;
  ev_ebitda?: Cell;
  dy?: Cell;
  roic?: Cell;
  revenue?: Cell;
  ebitda?: Cell;
  net_debt?: Cell;
  net_income?: Cell;
};

// Linha bruta vinda do Supabase (dados_estruturados).
type MetricRow = {
  empresa: string;
  fonte: Fonte;
  metrica: string;
  periodo: string | null;
  valor: number;
  unidade: string | null;
  data_relatorio: string | null;
  pdf_id: number | null;
};

type StockGuideRow = {
  ticker: string;
  source_bank: Fonte;
  rating: string | null;
  price: number | null;
  report_date: string | null;
  price_date: string | null;
  pdf_id: number | null;
  pe_2026: number | null;
  pe_2027: number | null;
  pe_2025: number | null;
  ev_ebitda_2026: number | null;
  ev_ebitda_2027: number | null;
  ev_ebitda_2025: number | null;
  div_yield_2026_pct: number | null;
  div_yield_2027_pct: number | null;
  div_yield_2025_pct: number | null;
};

// Principal: busca tudo em 2 selects e agrega no TS.
// Filtra no banco pelos tickers permitidos (ALLOWED_TICKERS) para nao trafegar
// dados de empresas que nao serao exibidas.
export async function getResearch(): Promise<ResearchRow[]> {
  const tickers = ALLOWED_TICKERS as unknown as string[];
  const [mRes, gRes] = await Promise.all([
    supabase
      .from("dados_estruturados")
      .select("empresa,fonte,metrica,periodo,valor,unidade,data_relatorio,pdf_id")
      .in("fonte", FONTES as unknown as string[])
      .in("empresa", tickers)
      .returns<MetricRow[]>(),
    supabase
      .from("stock_guide")
      .select(
        "ticker,source_bank,rating,price,report_date,price_date,pdf_id," +
          "pe_2026,pe_2027,pe_2025," +
          "ev_ebitda_2026,ev_ebitda_2027,ev_ebitda_2025," +
          "div_yield_2026_pct,div_yield_2027_pct,div_yield_2025_pct"
      )
      .in("ticker", tickers)
      .returns<StockGuideRow[]>(),
  ]);
  if (mRes.error) throw mRes.error;
  if (gRes.error) throw gRes.error;
  return buildRows(mRes.data ?? [], gRes.data ?? []);
}

// Escolhe leitura mais recente: (1) maior data_relatorio,
// (2) preferir periodo 'E' (estimativa), (3) desempate lexicografico decrescente.
function pickLatest(rows: MetricRow[]): MetricRow | undefined {
  return [...rows].sort((a, b) => {
    const ad = a.data_relatorio ?? "";
    const bd = b.data_relatorio ?? "";
    if (ad !== bd) return ad > bd ? -1 : 1;
    const ae = /E$/.test(a.periodo ?? "") ? 1 : 0;
    const be = /E$/.test(b.periodo ?? "") ? 1 : 0;
    if (ae !== be) return be - ae;
    return (b.periodo ?? "").localeCompare(a.periodo ?? "");
  })[0];
}

function cell(r?: MetricRow): Cell | undefined {
  if (!r) return undefined;
  return {
    value: Number(r.valor),
    date: r.data_relatorio,
    periodo: r.periodo,
    unidade: r.unidade,
    pdf_id: r.pdf_id,
  };
}

// Quando nao ha metrica em dados_estruturados, cai para o stock_guide.
// Ordem de preferencia: 2026 > 2027 > 2025.
function sgFallback(
  sg: StockGuideRow | undefined,
  field: "pe" | "ev_ebitda" | "dy"
): Cell | undefined {
  if (!sg) return undefined;
  const map =
    field === "pe"
      ? ([
          ["pe_2026", "2026"],
          ["pe_2027", "2027"],
          ["pe_2025", "2025"],
        ] as const)
      : field === "ev_ebitda"
        ? ([
            ["ev_ebitda_2026", "2026"],
            ["ev_ebitda_2027", "2027"],
            ["ev_ebitda_2025", "2025"],
          ] as const)
        : ([
            ["div_yield_2026_pct", "2026"],
            ["div_yield_2027_pct", "2027"],
            ["div_yield_2025_pct", "2025"],
          ] as const);
  for (const [key, periodo] of map) {
    const v = sg[key as keyof StockGuideRow] as number | null;
    if (v != null) {
      return {
        value: Number(v),
        date: sg.report_date,
        periodo,
        unidade: field === "dy" ? "%" : "x",
        pdf_id: sg.pdf_id,
      };
    }
  }
  return undefined;
}

function buildRows(metrics: MetricRow[], guide: StockGuideRow[]): ResearchRow[] {
  // agrupa dados_estruturados por (empresa, fonte)
  const byPair = new Map<string, MetricRow[]>();
  for (const r of metrics) {
    const k = `${r.empresa}|${r.fonte}`;
    (byPair.get(k) ?? byPair.set(k, []).get(k)!).push(r);
  }

  // ultima linha de stock_guide por (ticker, source_bank)
  const sgLatest = new Map<string, StockGuideRow>();
  for (const g of guide) {
    const k = `${g.ticker}|${g.source_bank}`;
    const prev = sgLatest.get(k);
    if (!prev || (g.report_date ?? "") > (prev.report_date ?? ""))
      sgLatest.set(k, g);
  }

  // uniao das chaves (empresa x fonte pode existir so no stock_guide)
  const keys = new Set<string>();
  byPair.forEach((_, k) => keys.add(k));
  sgLatest.forEach((_, k) => keys.add(k));
  const out: ResearchRow[] = [];

  for (const k of Array.from(keys)) {
    const [empresa, fonte] = k.split("|") as [string, Fonte];
    if (!FONTES.includes(fonte)) continue;

    const arr = byPair.get(k) ?? [];
    const byMetric: Record<string, MetricRow[]> = {};
    for (const r of arr) (byMetric[r.metrica] ??= []).push(r);
    const pick = (m: string) => cell(pickLatest(byMetric[m] ?? []));

    const sg = sgLatest.get(k);
    const tp = pickLatest(byMetric["Target Price"] ?? []);

    out.push({
      empresa,
      fonte,
      rating: sg?.rating
        ? { value: sg.rating, date: sg.report_date }
        : undefined,
      price:
        sg?.price != null
          ? { value: Number(sg.price), date: sg.price_date }
          : undefined,
      target: tp
        ? {
            value: Number(tp.valor),
            ccy: tp.unidade ?? "R$",
            date: tp.data_relatorio,
            periodo: tp.periodo,
            unidade: tp.unidade,
            pdf_id: tp.pdf_id,
          }
        : undefined,
      pe: pick("P/E") ?? sgFallback(sg, "pe"),
      ev_ebitda: pick("EV/EBITDA") ?? sgFallback(sg, "ev_ebitda"),
      dy: pick("Dividend Yield") ?? sgFallback(sg, "dy"),
      roic: pick("RoIC"),
      revenue: pick("Revenue"),
      ebitda: pick("EBITDA"),
      net_debt: pick("Net Debt"),
      net_income: pick("Net Income"),
    });
  }

  return out.sort(
    (a, b) =>
      a.empresa.localeCompare(b.empresa) || a.fonte.localeCompare(b.fonte)
  );
}

// Data mais recente observada em qualquer celula da linha.
// Usado pelo filtro de periodo client-side.
export function latestActivityDate(row: ResearchRow): string | null {
  const dates: (string | null | undefined)[] = [
    row.rating?.date,
    row.price?.date,
    row.target?.date,
    row.pe?.date,
    row.ev_ebitda?.date,
    row.dy?.date,
    row.roic?.date,
    row.revenue?.date,
    row.ebitda?.date,
    row.net_debt?.date,
    row.net_income?.date,
  ];
  let max: string | null = null;
  for (const d of dates) {
    if (d && (!max || d > max)) max = d;
  }
  return max;
}

// Estatisticas dos 4 cards do topo. Le direto das tabelas, sem view.
export interface SummaryStats {
  empresasCount: number;
  relatorios30d: number;
  metricasTotal: number;
  ultimaAtualizacao: string | null;
}

export async function getSummaryStats(): Promise<SummaryStats> {
  const tickers = ALLOWED_TICKERS as unknown as string[];
  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);
  const minIso = d30.toISOString().slice(0, 10);

  // 1) Empresas distintas em dados_estruturados (uniao com stock_guide)
  //    + pdf_ids dos ultimos 30 dias + data max, filtrado pela whitelist.
  const { data: metricas, error: e1 } = await supabase
    .from("dados_estruturados")
    .select("empresa, pdf_id, data_relatorio")
    .in("empresa", tickers)
    .order("data_relatorio", { ascending: false });
  if (e1) throw e1;

  const { data: guide, error: e2 } = await supabase
    .from("stock_guide")
    .select("ticker")
    .in("ticker", tickers);
  if (e2) throw e2;

  const empresas = new Set<string>();
  for (const r of metricas ?? []) empresas.add(r.empresa);
  for (const g of guide ?? []) empresas.add(g.ticker);

  const pdfSet = new Set<number>();
  let lastDate: string | null = null;
  for (const r of metricas ?? []) {
    if (!lastDate && r.data_relatorio) lastDate = r.data_relatorio;
    if (r.data_relatorio && r.data_relatorio >= minIso && r.pdf_id != null) {
      pdfSet.add(r.pdf_id);
    }
  }

  // 2) Contagem de linhas em dados_estruturados dentro da whitelist.
  const { count, error: e3 } = await supabase
    .from("dados_estruturados")
    .select("*", { count: "exact", head: true })
    .in("empresa", tickers);
  if (e3) throw e3;

  return {
    empresasCount: empresas.size,
    relatorios30d: pdfSet.size,
    metricasTotal: count ?? 0,
    ultimaAtualizacao: lastDate,
  };
}

// Lista distinta de empresas (usado pelo combobox).
// So devolve empresas que estao em ALLOWED_TICKERS E tem pelo menos um registro.
export async function getEmpresas(): Promise<string[]> {
  const tickers = ALLOWED_TICKERS as unknown as string[];
  const [mRes, gRes] = await Promise.all([
    supabase.from("dados_estruturados").select("empresa").in("empresa", tickers),
    supabase.from("stock_guide").select("ticker").in("ticker", tickers),
  ]);
  if (mRes.error) throw mRes.error;
  if (gRes.error) throw gRes.error;
  const set = new Set<string>();
  for (const r of mRes.data ?? []) set.add(r.empresa);
  for (const g of gRes.data ?? []) set.add(g.ticker);
  return Array.from(set).sort();
}

// Drawer: historico completo por empresa.
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

// Drawer: PDFs de origem.
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
