// Sanidade pos-backfill: para cada linha onde temos NI publicado E podemos
// derivar NI (shares + P/E + price), computa razao NI_derivado/NI_publicado.
// Loga mediana, min, max, p25, p75 global. Se mediana estiver fora de
// [0.98, 1.02] alguma coisa no input ta sistematicamente errada.
//
// Rodar: npm run validate:derivation (ou npx tsx scripts/validate-derivation.ts)

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

const ALLOWED_TICKERS = [
  "PETR4", "SLCE3", "VBBR3", "GOAU3", "DXCO3", "GOAU4", "SUZB3", "VALE3",
  "POSI3", "RAPT3", "LOGG3", "LREN3", "POMO3", "AZUL", "RAPT4", "ALOS3",
  "POMO4", "MRVE3", "BRBI11", "ITUB4", "PSSA3", "ITUB3", "INBR32", "CMIG4",
  "TIMS3", "EQTL3", "AXIA3", "ENGI11", "AXIA7", "VIVT3", "AXIA6",
];
const FONTES = ["BTG Pactual", "Bradesco BBI", "Safra"] as const;

function quantile(nums: number[], q: number): number {
  if (nums.length === 0) return NaN;
  const s = [...nums].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

async function main() {
  console.log("Buscando dados...");
  const [sgRes, niRes, shRes] = await Promise.all([
    supabase
      .from("stock_guide")
      .select(
        "ticker,source_bank,price,report_date,pe_2025,pe_2026,pe_2027"
      )
      .in("ticker", ALLOWED_TICKERS),
    supabase
      .from("dados_estruturados")
      .select("empresa,fonte,periodo,valor")
      .eq("metrica", "Net Income")
      .in("empresa", ALLOWED_TICKERS)
      .in("fonte", FONTES as unknown as string[]),
    supabase.from("ticker_shares").select("ticker,shares_outstanding"),
  ]);
  if (sgRes.error) throw sgRes.error;
  if (niRes.error) throw niRes.error;
  if (shRes.error) throw shRes.error;

  const sharesByTicker = new Map<string, number>();
  for (const s of shRes.data ?? []) {
    sharesByTicker.set(
      (s as { ticker: string }).ticker,
      Number((s as { shares_outstanding: number }).shares_outstanding)
    );
  }

  // Indexa SG mais recente por (ticker, fonte).
  type SG = {
    ticker: string;
    source_bank: string;
    price: number | null;
    report_date: string | null;
    pe_2025: number | null;
    pe_2026: number | null;
    pe_2027: number | null;
  };
  const sgLatest = new Map<string, SG>();
  for (const g of (sgRes.data ?? []) as SG[]) {
    const k = `${g.ticker}|${g.source_bank}`;
    const prev = sgLatest.get(k);
    if (!prev || (g.report_date ?? "") > (prev.report_date ?? "")) sgLatest.set(k, g);
  }

  const ratios: number[] = [];
  const byTicker = new Map<string, number[]>();
  for (const n of (niRes.data ?? []) as {
    empresa: string;
    fonte: string;
    periodo: string | null;
    valor: number;
  }[]) {
    const year = n.periodo?.match(/(20\d{2})/)?.[1];
    if (!year) continue;
    const sg = sgLatest.get(`${n.empresa}|${n.fonte}`);
    if (!sg || sg.price == null) continue;
    const pe =
      year === "2025"
        ? sg.pe_2025
        : year === "2026"
          ? sg.pe_2026
          : year === "2027"
            ? sg.pe_2027
            : null;
    if (pe == null || pe <= 0) continue;
    const shares = sharesByTicker.get(n.empresa);
    if (shares == null) continue;
    const implied = (Number(sg.price) * shares) / Number(pe);
    const ratio = implied / Number(n.valor);
    if (isFinite(ratio) && ratio > 0) {
      ratios.push(ratio);
      (byTicker.get(n.empresa) ?? byTicker.set(n.empresa, []).get(n.empresa)!).push(ratio);
    }
  }

  if (ratios.length === 0) {
    console.log("Sem pontos comparaveis. Rode o backfill antes.");
    return;
  }

  const med = quantile(ratios, 0.5);
  const min = Math.min(...ratios);
  const max = Math.max(...ratios);
  const p25 = quantile(ratios, 0.25);
  const p75 = quantile(ratios, 0.75);
  console.log(`\nAmostras: ${ratios.length}`);
  console.log(`  min    = ${min.toFixed(4)}`);
  console.log(`  p25    = ${p25.toFixed(4)}`);
  console.log(`  med    = ${med.toFixed(4)}`);
  console.log(`  p75    = ${p75.toFixed(4)}`);
  console.log(`  max    = ${max.toFixed(4)}`);

  const ok = med >= 0.98 && med <= 1.02;
  console.log(`\nMediana ${ok ? "DENTRO" : "FORA"} do range [0.98, 1.02]`);

  // Worst offenders por ticker.
  const offenders: Array<{ ticker: string; med: number; n: number }> = [];
  for (const [t, rs] of byTicker) {
    const m = quantile(rs, 0.5);
    if (m < 0.98 || m > 1.02) offenders.push({ ticker: t, med: m, n: rs.length });
  }
  offenders.sort((a, b) => Math.abs(1 - b.med) - Math.abs(1 - a.med));
  if (offenders.length > 0) {
    console.log("\nTickers fora do range (mediana por ticker):");
    for (const o of offenders.slice(0, 15))
      console.log(`  ${o.ticker}: ${o.med.toFixed(4)} (${o.n} amostras)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
