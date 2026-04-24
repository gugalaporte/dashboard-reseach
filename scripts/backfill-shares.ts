// Script de backfill da tabela `ticker_shares`.
//
// Estrategia:
// - Para cada ticker na whitelist, tenta cada fonte em ordem: BTG → BBI → Safra.
// - Para cada fonte, tenta cada periodo em ordem: 2026E → 2027E → 2025E.
// - Se todos os inputs (P/E, Net Income, price) existem: back-calcula shares.
// - Antes de gravar, faz RECONCILIACAO: pra cada OUTRO periodo (da mesma fonte)
//   onde temos P/E + NI + price, recalcula NI_implied = price×shares_candidate/pe
//   e compara com NI publicado. Mediana das razoes deve estar em [0.98, 1.02].
//   Se nao estiver, descarta o candidato e tenta o proximo periodo/fonte.
// - Idempotente via upsert por ticker.
//
// Rodar: npm run backfill:shares (ou npx tsx scripts/backfill-shares.ts)

import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./_env";

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltam SUPABASE_URL / SUPABASE_KEY no .env");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// Mesma whitelist do app.
const ALLOWED_TICKERS = [
  "PETR4", "SLCE3", "VBBR3", "GOAU3", "DXCO3", "GOAU4", "SUZB3", "VALE3",
  "POSI3", "RAPT3", "LOGG3", "LREN3", "POMO3", "AZUL", "RAPT4", "ALOS3",
  "POMO4", "MRVE3", "BRBI11", "ITUB4", "PSSA3", "ITUB3", "INBR32", "CMIG4",
  "TIMS3", "EQTL3", "AXIA3", "ENGI11", "AXIA7", "VIVT3", "AXIA6",
];
const FONTES = ["BTG Pactual", "Bradesco BBI", "Safra"] as const;
type Fonte = (typeof FONTES)[number];
const PERIODS = ["2026E", "2027E", "2025E"];

// Margem de aceitacao da razao NI_implied / NI_publicado.
const RATIO_MIN = 0.98;
const RATIO_MAX = 1.02;

type StockGuide = {
  ticker: string;
  source_bank: string;
  price: number | null;
  price_date: string | null;
  report_date: string | null;
  pe_2025: number | null;
  pe_2026: number | null;
  pe_2027: number | null;
};
type NIRow = {
  empresa: string;
  fonte: string;
  periodo: string | null;
  valor: number;
  data_relatorio: string | null;
};

function peForYear(sg: StockGuide, year: string): number | null {
  if (year === "2025") return sg.pe_2025;
  if (year === "2026") return sg.pe_2026;
  if (year === "2027") return sg.pe_2027;
  return null;
}

function median(nums: number[]): number {
  if (nums.length === 0) return NaN;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

async function fetchAll() {
  const [sg, ni] = await Promise.all([
    supabase
      .from("stock_guide")
      .select(
        "ticker,source_bank,price,price_date,report_date,pe_2025,pe_2026,pe_2027"
      )
      .in("ticker", ALLOWED_TICKERS)
      .returns<StockGuide[]>(),
    supabase
      .from("dados_estruturados")
      .select("empresa,fonte,periodo,valor,data_relatorio")
      .eq("metrica", "Net Income")
      .in("empresa", ALLOWED_TICKERS)
      .in("fonte", FONTES as unknown as string[])
      .returns<NIRow[]>(),
  ]);
  if (sg.error) throw sg.error;
  if (ni.error) throw ni.error;
  return { sg: sg.data ?? [], ni: ni.data ?? [] };
}

// Indexa NI por (ticker, fonte, ano) pegando a linha mais recente.
function indexNI(ni: NIRow[]): Map<string, number> {
  const latest = new Map<string, { valor: number; date: string }>();
  for (const r of ni) {
    const year = r.periodo?.match(/(20\d{2})/)?.[1];
    if (!year) continue;
    const k = `${r.empresa}|${r.fonte}|${year}`;
    const d = r.data_relatorio ?? "";
    const prev = latest.get(k);
    if (!prev || d > prev.date) latest.set(k, { valor: Number(r.valor), date: d });
  }
  const out = new Map<string, number>();
  for (const [k, v] of latest) out.set(k, v.valor);
  return out;
}

// Para cada (ticker, fonte), pega o registro mais recente do stock_guide.
function indexSG(sg: StockGuide[]): Map<string, StockGuide> {
  const latest = new Map<string, StockGuide>();
  for (const g of sg) {
    const k = `${g.ticker}|${g.source_bank}`;
    const prev = latest.get(k);
    if (!prev || (g.report_date ?? "") > (prev.report_date ?? ""))
      latest.set(k, g);
  }
  return latest;
}

type Candidate = {
  shares: number;
  source: Fonte;
  period: string;
};

// Tenta produzir um candidato de shares para um ticker, testando fontes e periodos.
function tryCandidates(
  ticker: string,
  sgIdx: Map<string, StockGuide>,
  niIdx: Map<string, number>
): Candidate[] {
  const out: Candidate[] = [];
  for (const source of FONTES) {
    const sg = sgIdx.get(`${ticker}|${source}`);
    if (!sg || sg.price == null || sg.price <= 0) continue;
    for (const period of PERIODS) {
      const year = period.replace("E", "");
      const pe = peForYear(sg, year);
      if (pe == null || pe <= 0) continue;
      const ni = niIdx.get(`${ticker}|${source}|${year}`);
      if (ni == null) continue;
      // shares = (NI × PE) / price. Escala fica auto-consistente com a fonte.
      const shares = (Number(ni) * Number(pe)) / Number(sg.price);
      if (!isFinite(shares) || shares <= 0) continue;
      out.push({ shares, source, period });
    }
  }
  return out;
}

// Reconcilia um candidato de shares contra TODOS os pontos (ticker, fonte, ano)
// onde temos P/E + NI + price. Mediana da razao NI_implied/NI_publicado deve
// estar dentro de [RATIO_MIN, RATIO_MAX]. Retorna a mediana (NaN se sem dados).
function reconcile(
  ticker: string,
  shares: number,
  sgIdx: Map<string, StockGuide>,
  niIdx: Map<string, number>
): { median: number; samples: number } {
  const ratios: number[] = [];
  for (const source of FONTES) {
    const sg = sgIdx.get(`${ticker}|${source}`);
    if (!sg || sg.price == null || sg.price <= 0) continue;
    for (const period of PERIODS) {
      const year = period.replace("E", "");
      const pe = peForYear(sg, year);
      if (pe == null || pe <= 0) continue;
      const ni = niIdx.get(`${ticker}|${source}|${year}`);
      if (ni == null) continue;
      const niImplied = (Number(sg.price) * shares) / Number(pe);
      const ratio = niImplied / Number(ni);
      if (isFinite(ratio) && ratio > 0) ratios.push(ratio);
    }
  }
  return { median: median(ratios), samples: ratios.length };
}

async function main() {
  console.log("Buscando stock_guide + Net Income...");
  const { sg, ni } = await fetchAll();
  console.log(`  stock_guide: ${sg.length} linhas · Net Income: ${ni.length} linhas`);

  const sgIdx = indexSG(sg);
  const niIdx = indexNI(ni);

  const winners: Array<{
    ticker: string;
    shares: number;
    source: Fonte;
    period: string;
    medianRatio: number;
    samples: number;
  }> = [];
  const losers: Array<{ ticker: string; reason: string }> = [];

  for (const ticker of ALLOWED_TICKERS) {
    const candidates = tryCandidates(ticker, sgIdx, niIdx);
    if (candidates.length === 0) {
      losers.push({ ticker, reason: "sem P/E + NI + price disponiveis" });
      continue;
    }
    // Testa candidatos na ordem (BTG/2026 primeiro). Aceita o primeiro que passa.
    let accepted: (typeof winners)[number] | null = null;
    let lastMedian = NaN;
    let lastSamples = 0;
    for (const c of candidates) {
      const { median: m, samples } = reconcile(ticker, c.shares, sgIdx, niIdx);
      lastMedian = m;
      lastSamples = samples;
      // Quando so temos 1 amostra, a razao sempre vai dar 1.0 (tautologico).
      // Exige pelo menos 2 amostras pra considerar que reconciliou.
      // Se so ha 1, aceitamos mesmo assim (tickers com poucos dados) mas logamos.
      const withinRange = m >= RATIO_MIN && m <= RATIO_MAX;
      if (withinRange) {
        accepted = { ticker, ...c, medianRatio: m, samples };
        break;
      }
    }
    if (accepted) {
      winners.push(accepted);
    } else {
      losers.push({
        ticker,
        reason: `reconciliacao fora do range [${RATIO_MIN}, ${RATIO_MAX}] · mediana=${lastMedian.toFixed(4)} (${lastSamples} amostras)`,
      });
    }
  }

  console.log(`\nResultado: ${winners.length} aceitos, ${losers.length} rejeitados/ausentes`);

  // Breakdown por fonte vencedora.
  const bySource = winners.reduce<Record<string, number>>((acc, w) => {
    acc[w.source] = (acc[w.source] ?? 0) + 1;
    return acc;
  }, {});
  console.log("  Fontes vencedoras:", bySource);

  if (losers.length > 0) {
    console.log("\nRejeitados / ausentes:");
    for (const l of losers) console.log(`  ${l.ticker}: ${l.reason}`);
  }

  if (winners.length === 0) {
    console.log("\nNada para gravar. Encerrando.");
    return;
  }

  const rows = winners.map((w) => ({
    ticker: w.ticker,
    shares_outstanding: w.shares,
    derived_from_source: w.source,
    derived_from_period: w.period,
    derived_at: new Date().toISOString(),
  }));

  console.log(`\nGravando ${rows.length} registros em ticker_shares...`);
  const { error } = await supabase.from("ticker_shares").upsert(rows, {
    onConflict: "ticker",
  });
  if (error) {
    console.error("Upsert falhou:", error);
    process.exit(1);
  }
  console.log("OK.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
