import type { PriceTarget } from "./bottom-up-types";
import { formatNumber } from "./format";

export type TargetInput = {
  price: number | null;
  marketCap: number | null;
  ebitda: number | null;
  netIncome: number | null;
  totalEquity: number | null;
  netDebt: number | null;
  histEv: number | null;
  sectorEv: number | null;
  histPe: number | null;
  sectorPe: number | null;
  histPb: number | null;
  sectorPb: number | null;
};

type Scale = { div: number; suffix: string; digits: number };

function scaleOf(values: number[]): Scale {
  const max = Math.max(...values.map((v) => Math.abs(v)), 0);
  if (max >= 1e9) return { div: 1e9, suffix: " bi", digits: 3 };
  if (max >= 1e6) return { div: 1e6, suffix: " mi", digits: 1 };
  return { div: 1, suffix: "", digits: 2 };
}

function money(v: number, scale: Scale): string {
  return `${formatNumber(v / scale.div, scale.digits)}${scale.suffix}`;
}

function quote(
  method: PriceTarget["method"],
  source: PriceTarget["source"],
  multiple: number,
  price: number,
  marketPrice: number,
  lines: string[]
): PriceTarget {
  return {
    method,
    source,
    multiple,
    price,
    upsidePct: ((price - marketPrice) / marketPrice) * 100,
    lines,
  };
}

function pushPair(
  out: PriceTarget[],
  method: PriceTarget["method"],
  hist: number | null,
  sector: number | null,
  build: (multiple: number, source: PriceTarget["source"]) => PriceTarget | null
) {
  if (hist != null && hist > 0) {
    const row = build(hist, "histórico");
    if (row) out.push(row);
  }
  if (sector != null && sector > 0) {
    const row = build(sector, "setor");
    if (row) out.push(row);
  }
}

/**
 * Preço alvo explícito.
 * EV/EBITDA: múltiplo × EBITDA = EV; equity = EV − (dívida − caixa).
 * P/L: lucro × P/L. P/BV: patrimônio × P/BV.
 * Preço = preço × equity alvo ÷ market cap.
 */
export function buildPriceTargets(input: TargetInput): PriceTarget[] {
  const { price, marketCap } = input;
  if (price == null || price <= 0 || marketCap == null || marketCap <= 0) {
    return [];
  }
  const out: PriceTarget[] = [];
  const mult = (v: number) => formatNumber(v, 5);
  const px = `R$ ${formatNumber(price, 2)}`;

  pushPair(out, "EV/EBITDA", input.histEv, input.sectorEv, (multiple, source) => {
    const ebitda = input.ebitda;
    const netDebt = input.netDebt;
    if (ebitda == null || ebitda <= 0 || netDebt == null) return null;
    const ev = multiple * ebitda;
    const equity = ev - netDebt;
    if (equity <= 0) return null;
    const target = (price * equity) / marketCap;
    const scale = scaleOf([ev, equity, ebitda, netDebt, marketCap]);
    const debtOp = netDebt < 0 ? "+" : "−";
    return quote("EV/EBITDA", source, multiple, target, price, [
      `${mult(multiple)} × ${money(ebitda, scale)} = ${money(ev, scale)} de EV`,
      `${money(ev, scale)} ${debtOp} ${money(Math.abs(netDebt), scale)} = ${money(equity, scale)} de equity`,
      `${px} × ${money(equity, scale)} ÷ ${money(marketCap, scale)} = R$ ${formatNumber(target, 2)}`,
    ]);
  });

  pushPair(out, "P/L", input.histPe, input.sectorPe, (multiple, source) => {
    const earnings = input.netIncome;
    if (earnings == null || earnings <= 0) return null;
    const equity = earnings * multiple;
    if (equity <= 0) return null;
    const target = (price * equity) / marketCap;
    const scale = scaleOf([equity, earnings, marketCap]);
    return quote("P/L", source, multiple, target, price, [
      `${mult(multiple)} × ${money(earnings, scale)} = ${money(equity, scale)} de equity`,
      `${px} × ${money(equity, scale)} ÷ ${money(marketCap, scale)} = R$ ${formatNumber(target, 2)}`,
    ]);
  });

  pushPair(out, "P/BV", input.histPb, input.sectorPb, (multiple, source) => {
    const book = input.totalEquity;
    if (book == null || book <= 0) return null;
    const equity = book * multiple;
    if (equity <= 0) return null;
    const target = (price * equity) / marketCap;
    const scale = scaleOf([equity, book, marketCap]);
    return quote("P/BV", source, multiple, target, price, [
      `${mult(multiple)} × ${money(book, scale)} = ${money(equity, scale)} de equity`,
      `${px} × ${money(equity, scale)} ÷ ${money(marketCap, scale)} = R$ ${formatNumber(target, 2)}`,
    ]);
  });

  return out;
}
