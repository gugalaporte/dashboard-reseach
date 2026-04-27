import { parseDisplayDate } from "./format";
import { supabase } from "./supabase";
import type { MetricaRow, PdfDoc } from "@/types/research";
import { canonicalMetricId, extractYear, type MetricId } from "./metrics";
import { deriveEPSFromPriceAndPE, deriveNetIncomeFromEPS } from "./derive-metrics";

// Fontes (corretoras) presentes na base (alinhado a dados_estruturados.fonte).
export const FONTES = [
  "BTG Pactual",
  "Bradesco BBI",
  "Safra",
  "Itaú BBA",
] as const;
export type Fonte = (typeof FONTES)[number];

// Label curto na tabela / filtros / badge "via XXX".
export const FONTE_SHORT_LABEL: Record<Fonte, string> = {
  "BTG Pactual": "BTG",
  "Bradesco BBI": "Bradesco",
  Safra: "SAFRA",
  "Itaú BBA": "Itau",
};

// Whitelist de tickers exibidos no dashboard.
// Qualquer empresa fora desta lista nao aparece na tabela nem nos filtros.
export const ALLOWED_TICKERS = [
  "PETR4", "SLCE3", "VBBR3", "GOAU3", "DXCO3", "GOAU4", "SUZB3", "VALE3",
  "POSI3", "RAPT3", "LOGG3", "LREN3", "POMO3", "AZUL", "RAPT4", "ALOS3",
  "POMO4", "MRVE3", "BRBI11", "ITUB4", "PSSA3", "ITUB3", "INBR32", "CMIG4",
  "TIMS3", "EQTL3", "AXIA3", "ENGI11", "AXIA7", "VIVT3", "AXIA6",
] as const;

// Celula generica de metrica: valor + metadados de origem.
// Flags opcionais `derived`/`formula`/`priceDate` sinalizam que a celula nao
// veio publicada no relatorio e sim calculada (ver lib/derive-metrics.ts).
// UI usa pra mudar estilo e mostrar tooltip explicativo.
export type Cell = {
  value: number;
  date: string | null;
  periodo?: string | null;
  unidade?: string | null;
  pdf_id?: number | null;
  derived?: boolean;
  formula?: string;
  priceDate?: string;
  // Banco ancora usado na derivacao de Net Income (EPS cross-anchor).
  anchorBank?: string;
  // Metadados do tooltip quando EPS veio de preço/P/E do stock_guide.
  epsDerivation?: {
    reportPrice: number;
    pe: number;
    peDate: string;
    /** true quando price veio do Yahoo (guide sem preço na data do report). */
    usedYahooClose?: boolean;
  };
};

// Celula de target: extende Cell com moeda, upside opcional vindo do banco
// e flags de fallback (quando a linha pega target de outra corretora).
export type TargetCell = Cell & {
  ccy: string;
  upside?: number | null;
  is_fallback?: boolean;
  fallback_source?: Fonte;
};

// Linha consumida pela tabela. Cada metrica vira uma celula opcional.
// byMetricYear: matriz metrica canonica (id) x ano ("2026") -> Cell.
// Usada pelas colunas dinamicas da tabela principal. Quando varios aliases
// da mesma metrica tem valor para o mesmo ano, vence o mais recente.
export type ResearchRow = {
  empresa: string;
  fonte: Fonte;
  /** Setor do stock_guide (ingles); UI traduz com lib/sector-labels. */
  sector?: string | null;
  rating?: { value: string; date: string | null };
  price?: { value: number; date: string | null };
  target?: TargetCell;
  pe?: Cell;
  ev_ebitda?: Cell;
  dy?: Cell;
  roic?: Cell;
  revenue?: Cell;
  ebitda?: Cell;
  net_debt?: Cell;
  net_income?: Cell;
  byMetricYear?: Partial<Record<MetricId, Record<string, Cell>>>;
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

export type StockGuideRow = {
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
  // Novas colunas: TP e upside ja vem calculados do stock_guide.
  target_price: number | null;
  upside: number | null;
  sector: string | null;
};

// Bruto Supabase (sem Yahoo). Usado pela rota GET /api/research no servidor.
export async function loadResearchRaw(): Promise<{
  metrics: MetricRow[];
  guide: StockGuideRow[];
}> {
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
        "ticker,source_bank,rating,price,report_date,price_date,pdf_id,sector," +
          "pe_2026,pe_2027,pe_2025," +
          "ev_ebitda_2026,ev_ebitda_2027,ev_ebitda_2025," +
          "div_yield_2026_pct,div_yield_2027_pct,div_yield_2025_pct," +
          "target_price,upside"
      )
      .in("ticker", tickers)
      .returns<StockGuideRow[]>(),
  ]);
  if (mRes.error) throw mRes.error;
  if (gRes.error) throw gRes.error;
  return { metrics: mRes.data ?? [], guide: gRes.data ?? [] };
}

// Pares (ticker, data) para buscar fechamento Yahoo quando o guide nao tem preço.
export function collectYahooReportClosePairs(
  guide: StockGuideRow[]
): { ticker: string; reportDate: string }[] {
  const seen = new Set<string>();
  const out: { ticker: string; reportDate: string }[] = [];
  for (const g of guide) {
    if (g.price != null && Number(g.price) > 0) continue;
    if (!g.report_date) continue;
    const hasPe = [g.pe_2025, g.pe_2026, g.pe_2027].some(
      (v) => v != null && Number(v) > 0
    );
    if (!hasPe) continue;
    const k = `${g.ticker}|${g.report_date}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ ticker: g.ticker, reportDate: g.report_date });
  }
  return out;
}

// Principal no browser: delega ao servidor (Yahoo + build em Node).
export async function getResearch(): Promise<ResearchRow[]> {
  const res = await fetch("/api/research", { cache: "no-store" });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`getResearch: ${res.status} ${msg}`);
  }
  return res.json() as Promise<ResearchRow[]>;
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

// Ancora cross-casa: (ticker, ano) com NI publicado em R$ (nao US$) + P/E + preco
// do stock_guide. Preferencia: BTG Pactual, depois Bradesco BBI.
type NetIncomeAnchor = {
  ni: number;
  pe: number;
  price: number;
  bank: Fonte;
};

const ANCHOR_YEARS = ["2026", "2027", "2025"] as const;
const ANCHOR_ORDER: Fonte[] = ["BTG Pactual", "Bradesco BBI", "Itaú BBA"];

function peForYear(sg: StockGuideRow, year: string): number | null {
  if (year === "2025") return sg.pe_2025;
  if (year === "2026") return sg.pe_2026;
  if (year === "2027") return sg.pe_2027;
  return null;
}

// Filtro leve: exclui linhas de NI claramente em US$ (evita ancora errada).
function isNiR$Mn(r: MetricRow): boolean {
  const u = (r.unidade ?? "").toLowerCase();
  if (u.includes("us$") || u.includes("usd") || u.includes("dólar") || u.includes("dolar"))
    return false;
  return true;
}

// EPS publicado deve ser BRL (mesma regra de exclusao de FX que NI).
function isEpsPublishedBrl(unidade: string | null | undefined): boolean {
  const u = (unidade ?? "").toLowerCase();
  if (u.includes("us$") || u.includes("usd") || u.includes("dólar") || u.includes("dolar"))
    return false;
  return true;
}

// Gap entre data do EPS e report_date do guide; "true" = dentro de 30 dias.
function epsWithin30OfReport(
  epsDate: string | null | undefined,
  reportDate: string | null | undefined
): boolean {
  if (!reportDate || !epsDate) return true;
  const a = parseDisplayDate(epsDate).getTime();
  const b = parseDisplayDate(reportDate).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return true;
  return Math.abs(a - b) <= 30 * 86400000;
}

// Mantemos EPS estruturado em R$; se ambas as datas existem, exige gap <= 30d.
function keepPublishedEps(c: Cell, reportDate: string | null): boolean {
  if (!isEpsPublishedBrl(c.unidade)) return false;
  if (c.date && reportDate) return epsWithin30OfReport(c.date, reportDate);
  return true;
}

// Escolhe a linha de NI cuja data_relatorio fica mais proxima de report_date do guide.
function pickNIByClosestReport(
  niRows: MetricRow[],
  anchorReportDate: string | null
): MetricRow | undefined {
  const filtered = niRows.filter(isNiR$Mn);
  if (filtered.length === 0) return undefined;
  if (!anchorReportDate) return pickLatest(filtered);
  const t0 = parseDisplayDate(anchorReportDate).getTime();
  let best: MetricRow | undefined;
  let bestDiff = Infinity;
  for (const r of filtered) {
    const d = r.data_relatorio ? parseDisplayDate(r.data_relatorio).getTime() : NaN;
    if (Number.isNaN(d)) continue;
    const diff = Math.abs(d - t0);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = r;
    }
  }
  return best ?? pickLatest(filtered);
}

function tryAnchorForTickerYear(
  ticker: string,
  fonte: Fonte,
  year: string,
  byPair: Map<string, MetricRow[]>,
  sgLatest: Map<string, StockGuideRow>
): NetIncomeAnchor | null {
  const sg = sgLatest.get(`${ticker}|${fonte}`);
  if (!sg || sg.price == null || sg.price <= 0) return null;
  const pe = peForYear(sg, year);
  if (pe == null || pe <= 0) return null;
  const arr = byPair.get(`${ticker}|${fonte}`) ?? [];
  const niCandidates = arr.filter(
    (r) =>
      canonicalMetricId(r.metrica) === "net_income" && extractYear(r.periodo) === year
  );
  const niRow = pickNIByClosestReport(niCandidates, sg.report_date);
  if (!niRow) return null;
  return {
    ni: Number(niRow.valor),
    pe: Number(pe),
    price: Number(sg.price),
    bank: fonte,
  };
}

// Mapa `ticker|ano` (ex. PETR4|2026) -> ancora. Montado antes do loop de linhas.
function buildNetIncomeAnchorMap(
  byPair: Map<string, MetricRow[]>,
  sgLatest: Map<string, StockGuideRow>
): Map<string, NetIncomeAnchor> {
  const map = new Map<string, NetIncomeAnchor>();
  const tickers = ALLOWED_TICKERS as unknown as string[];
  for (const ticker of tickers) {
    for (const year of ANCHOR_YEARS) {
      const k = `${ticker}|${year}`;
      if (map.has(k)) continue;
      for (const fonte of ANCHOR_ORDER) {
        const a = tryAnchorForTickerYear(ticker, fonte, year, byPair, sgLatest);
        if (a) {
          map.set(k, a);
          break;
        }
      }
    }
  }
  return map;
}

// Preço do report: stock_guide.price; se vazio, fechamento Yahoo até report_date (map key ticker|yyyy-mm-dd).
function resolvePriceAtReport(
  sg: StockGuideRow,
  empresa: string,
  yahooReportClose: Map<string, number>
): { price: number; fromYahoo: boolean } | null {
  if (sg.price != null && Number(sg.price) > 0) {
    return { price: Number(sg.price), fromYahoo: false };
  }
  const rd = sg.report_date;
  if (!rd) return null;
  const y = yahooReportClose.get(`${empresa}|${rd}`);
  if (y != null && Number.isFinite(y) && y > 0) return { price: y, fromYahoo: true };
  return null;
}

// Agrega linhas do dashboard (usado em GET /api/research no servidor).
export function buildRows(
  metrics: MetricRow[],
  guide: StockGuideRow[],
  yahooReportClose: Map<string, number> = new Map()
): ResearchRow[] {
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

  const netIncomeAnchorMap = buildNetIncomeAnchorMap(byPair, sgLatest);

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

    // Prioridade do target:
    //   1) stock_guide.target_price (dados novos, padronizados e recentes)
    //   2) dados_estruturados.Target Price (fallback legado quando SG nao tem)
    const target: TargetCell | undefined =
      sg?.target_price != null
        ? {
            value: Number(sg.target_price),
            ccy: "R$",
            date: sg.report_date,
            periodo: null,
            unidade: "R$",
            pdf_id: sg.pdf_id,
            upside: sg.upside != null ? Number(sg.upside) : null,
          }
        : tp
          ? {
              value: Number(tp.valor),
              ccy: tp.unidade ?? "R$",
              date: tp.data_relatorio,
              periodo: tp.periodo,
              unidade: tp.unidade,
              pdf_id: tp.pdf_id,
            }
          : undefined;

    // byMetricYear: metrica canonica -> ano -> Cell. Vence o mais recente quando
    // ha duplicatas (aliases diferentes com o mesmo ano).
    const byMetricYear: Partial<Record<MetricId, Record<string, Cell>>> = {};
    for (const r of arr) {
      const id = canonicalMetricId(r.metrica);
      if (!id) continue;
      const year = extractYear(r.periodo);
      if (!year) continue;
      const bucket = (byMetricYear[id] ??= {});
      const existing = bucket[year];
      const existingDate = existing?.date ?? "";
      const thisDate = r.data_relatorio ?? "";
      if (!existing || thisDate > existingDate) {
        bucket[year] = cell(r)!;
      }
    }

    // Fallback de stock_guide quando a metrica nao existe em dados_estruturados.
    // Cobre apenas P/E, EV/EBITDA e DY (unicas colunas wide no stock_guide).
    if (sg) {
      const sgMap: Array<[MetricId, keyof StockGuideRow, string, string]> = [
        ["pe", "pe_2025", "2025", "x"],
        ["pe", "pe_2026", "2026", "x"],
        ["pe", "pe_2027", "2027", "x"],
        ["ev_ebitda", "ev_ebitda_2025", "2025", "x"],
        ["ev_ebitda", "ev_ebitda_2026", "2026", "x"],
        ["ev_ebitda", "ev_ebitda_2027", "2027", "x"],
        ["dy", "div_yield_2025_pct", "2025", "%"],
        ["dy", "div_yield_2026_pct", "2026", "%"],
        ["dy", "div_yield_2027_pct", "2027", "%"],
      ];
      for (const [mid, key, year, unit] of sgMap) {
        const v = sg[key] as number | null;
        if (v == null) continue;
        const bucket = (byMetricYear[mid] ??= {});
        if (!bucket[year]) {
          bucket[year] = {
            value: Number(v),
            date: sg.report_date,
            periodo: year,
            unidade: unit,
            pdf_id: sg.pdf_id,
          };
        }
      }
    }

    // EPS derivado do stock_guide quando nao ha EPS publicado em R$ alinhado ao report.
    const peForEps = byMetricYear["pe"];
    if (peForEps && sg) {
      const epsBucket = (byMetricYear["eps"] ??= {});
      const reportDate = sg.report_date;
      for (const year of Object.keys(peForEps)) {
        const existing = epsBucket[year];
        if (existing && keepPublishedEps(existing, reportDate)) continue;

        const peCell = peForEps[year];
        if (peCell == null || peCell.value == null || peCell.value <= 0) continue;

        const atReport = resolvePriceAtReport(sg, empresa, yahooReportClose);
        if (!atReport) continue;

        const derived = deriveEPSFromPriceAndPE({
          publishedEPS: null,
          priceAtReport: atReport.price,
          pe: peCell.value,
          peDate: reportDate ?? "",
        });
        if (!derived.derived || Number.isNaN(derived.value)) continue;

        epsBucket[year] = {
          value: derived.value,
          date: reportDate,
          periodo: year,
          unidade: "R$",
          pdf_id: sg.pdf_id,
          derived: true,
          formula: derived.formula,
          priceDate: derived.priceDate,
          epsDerivation: {
            reportPrice: atReport.price,
            pe: peCell.value,
            peDate: reportDate ?? "",
            usedYahooClose: atReport.fromYahoo,
          },
        };
      }
    }

    // Derivacao de Net Income (EPS como ponte entre casas).
    // NI linha = NI_ancora × (EPS_linha / EPS_ancora), com EPS = Preço/P/E.
    // Preço e P/E da linha atual vêm do stock_guide (ou Yahoo na data do report
    // quando o guide nao tem preço); âncora vem de netIncomeAnchorMap.
    const peBucket = byMetricYear["pe"];
    const niBucket = (byMetricYear["net_income"] ??= {});
    if (peBucket && sg) {
      for (const year of Object.keys(peBucket)) {
        if (niBucket[year]) continue; // ja temos NI publicado
        const peCell = peBucket[year];
        const anchor = netIncomeAnchorMap.get(`${empresa}|${year}`) ?? null;
        const atReport = resolvePriceAtReport(sg, empresa, yahooReportClose);
        const derived = deriveNetIncomeFromEPS({
          publishedNI: null,
          anchorNI: anchor?.ni ?? null,
          anchorPE: anchor?.pe ?? null,
          anchorPrice: anchor?.price ?? null,
          anchorBank: anchor?.bank ?? null,
          pe: peCell?.value ?? null,
          priceAtReport: atReport?.price ?? null,
          priceDate: sg.price_date,
        });
        if (!derived?.derived) continue;
        niBucket[year] = {
          value: derived.value,
          date: sg.report_date,
          periodo: year,
          unidade: "R$ M",
          pdf_id: sg.pdf_id,
          derived: true,
          formula: derived.formula,
          priceDate: derived.priceDate,
          anchorBank: derived.anchorBank,
        };
      }
    }

    out.push({
      empresa,
      fonte,
      sector: sg?.sector ?? null,
      rating: sg?.rating
        ? { value: sg.rating, date: sg.report_date }
        : undefined,
      price:
        sg?.price != null
          ? { value: Number(sg.price), date: sg.price_date }
          : undefined,
      target,
      pe: pick("P/E") ?? sgFallback(sg, "pe"),
      ev_ebitda: pick("EV/EBITDA") ?? sgFallback(sg, "ev_ebitda"),
      dy: pick("Dividend Yield") ?? sgFallback(sg, "dy"),
      roic: pick("RoIC"),
      revenue: pick("Revenue"),
      ebitda: pick("EBITDA"),
      net_debt: pick("Net Debt"),
      net_income: pick("Net Income"),
      byMetricYear,
    });
  }

  // Fallback de target por corretora (pos-processamento).
  // Quando uma linha de Safra nao tem target mas o BBI tem, herda do BBI
  // mantendo a flag is_fallback para o UI sinalizar a origem.
  // Motivacao: PDF do Safra tem paginas com texto rotacionado/vetorial que
  // nao foi extraido (~62 tickers NULL no banco inteiro).
  applyTargetFallback(out, "Safra", "Bradesco BBI");

  return out.sort(
    (a, b) =>
      a.empresa.localeCompare(b.empresa) || a.fonte.localeCompare(b.fonte)
  );
}

// Preenche target NULL de linhas de `missingFonte` com o target de `sourceFonte`
// (mesmo ticker), marcando is_fallback. Calcula upside so se precos forem
// comparaveis (mesma moeda E ambos presentes).
function applyTargetFallback(
  rows: ResearchRow[],
  missingFonte: Fonte,
  sourceFonte: Fonte
): void {
  const byTickerSource = new Map<string, ResearchRow>();
  for (const r of rows) {
    if (r.fonte === sourceFonte && r.target) {
      byTickerSource.set(r.empresa, r);
    }
  }
  for (const r of rows) {
    if (r.fonte !== missingFonte) continue;
    if (r.target) continue;
    const src = byTickerSource.get(r.empresa);
    if (!src?.target) continue;
    const srcTarget = src.target;
    // Recalcula upside contra o preco da LINHA ATUAL (Safra), nao do BBI,
    // para refletir o upside implicito no preco mostrado naquela linha.
    const localUpside =
      r.price?.value != null && srcTarget.ccy === "R$"
        ? ((srcTarget.value - r.price.value) / r.price.value) * 100
        : null;
    r.target = {
      ...srcTarget,
      is_fallback: true,
      fallback_source: sourceFonte,
      upside: localUpside,
    };
  }
}

// Decide os N anos exibidos nas sub-colunas dinamicas.
// Estrategia: pega anos >= ano atual (estimativas), conta frequencia entre
// TODAS as linhas (nas metricas selecionadas), ordena por ano asc e pega os N.
// Se nao tiver anos futuros suficientes, completa com os anos mais frequentes.
export function detectYears(
  rows: ResearchRow[],
  metrics: MetricId[],
  count: number
): string[] {
  const freq = new Map<string, number>();
  for (const r of rows) {
    if (!r.byMetricYear) continue;
    for (const mid of metrics) {
      const bucket = r.byMetricYear[mid];
      if (!bucket) continue;
      for (const year of Object.keys(bucket)) {
        freq.set(year, (freq.get(year) ?? 0) + 1);
      }
    }
  }
  const currentYear = new Date().getFullYear();
  // Prioriza anos futuros (estimativas). Ordem ascendente para manter 2026,2027,2028.
  const future = [...freq.keys()]
    .filter((y) => Number(y) >= currentYear)
    .sort();
  const picked = future.slice(0, count);
  if (picked.length === count) return picked;
  // Completa com os anos mais frequentes restantes.
  const rest = [...freq.entries()]
    .filter(([y]) => !picked.includes(y))
    .sort((a, b) => b[1] - a[1])
    .map(([y]) => y);
  return [...picked, ...rest].slice(0, count);
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
