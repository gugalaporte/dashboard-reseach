/** Cálculos puros: bandas de múltiplos e preço alvo. */

import type {
  FairPriceView,
  IntrinsicEstimate,
  MultipleBand,
  SeriesPoint,
} from "./bottom-up-types";
import { buildPriceTargets } from "./target-price";

function finite(vals: Array<number | null | undefined>): number[] {
  return vals.filter((v): v is number => v != null && Number.isFinite(v));
}

function avg(vals: number[]): number | null {
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function median(vals: number[]): number | null {
  if (vals.length === 0) return null;
  const s = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

/** Banda histórica (min/média/máx) + mediana dos pares. */
export function buildMultipleBands(
  series: SeriesPoint[],
  currentPe: number | null,
  currentEv: number | null,
  peerPes: number[],
  peerEvs: number[]
): MultipleBand[] {
  const pes = finite(series.map((p) => p.peRatio));
  const evs = finite(series.map((p) => p.evEbitda));

  return [
    {
      key: "pe",
      label: "P/E",
      current: currentPe,
      min: pes.length ? Math.min(...pes) : null,
      avg: avg(pes),
      max: pes.length ? Math.max(...pes) : null,
      peerMedian: median(peerPes),
    },
    {
      key: "evEbitda",
      label: "EV/EBITDA",
      current: currentEv,
      min: evs.length ? Math.min(...evs) : null,
      avg: avg(evs),
      max: evs.length ? Math.max(...evs) : null,
      peerMedian: median(peerEvs),
    },
  ];
}

type IntrinsicInput = {
  price: number | null;
  pe: number | null;
  evEbitda: number | null;
  ebitda: number | null;
  netIncome?: number | null;
  totalEquity?: number | null;
  enterpriseValue: number | null;
  netDebt: number | null;
  /** Dívida bruta. Caixa = dívida bruta − dívida líquida do snapshot. */
  totalDebt?: number | null;
  marketCap: number | null;
  marketCapCurrency?: string | null;
  histAvgEvEbitda: number | null;
  peerMedianEvEbitda: number | null;
  histAvgPe: number | null;
  peerMedianPe?: number | null;
  histAvgPb?: number | null;
  peerMedianPb?: number | null;
};

/**
 * EV na mesma base do múltiplo. Prefere o enterprise value do LSEG.
 * Sem ele, usa market cap + dívida líquida.
 */
function evOnMultipleBasis(input: IntrinsicInput): {
  ev: number;
  netDebt: number;
} | null {
  const mkt = input.marketCap;
  if (mkt == null || mkt <= 0) return null;
  if (input.enterpriseValue != null && input.enterpriseValue > 0) {
    return { ev: input.enterpriseValue, netDebt: input.enterpriseValue - mkt };
  }
  if (input.netDebt == null) return null;
  const ev = mkt + input.netDebt;
  if (ev <= 0) return null;
  return { ev, netDebt: input.netDebt };
}

/** Preço justo antigo: múltiplo-alvo × EBITDA implícito no EV atual. */
function buildJusto(input: IntrinsicInput): FairPriceView | null {
  const targetEv = input.histAvgEvEbitda ?? input.peerMedianEvEbitda ?? null;
  const basis = evOnMultipleBasis(input);
  const { price, marketCap, evEbitda } = input;
  if (
    targetEv == null ||
    targetEv <= 0 ||
    basis == null ||
    evEbitda == null ||
    evEbitda <= 0 ||
    price == null ||
    price <= 0 ||
    marketCap == null ||
    marketCap <= 0
  ) {
    return null;
  }

  const impliedEbitda = basis.ev / evEbitda;
  if (!(impliedEbitda > 0)) return null;

  const grossDebt = input.totalDebt ?? null;
  const cash =
    grossDebt != null && input.netDebt != null ? grossDebt - input.netDebt : null;
  const fromBalance = cash != null && input.netDebt != null;
  const netDebt = fromBalance ? input.netDebt : basis.netDebt;
  const equity = targetEv * impliedEbitda - netDebt;
  const fairPrice = (price * equity) / marketCap;
  const sector = input.histAvgEvEbitda == null;
  const notes = [
    sector ? "mediana do EV/EBITDA do setor" : "",
    !fromBalance && input.enterpriseValue == null ? "dívida líquida" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    method: "Múltiplo-alvo EV/EBITDA",
    marketPrice: price,
    fairPrice,
    upsidePct: ((fairPrice - price) / price) * 100,
    targetMultiple: targetEv,
    currentMultiple: evEbitda,
    ebitda: impliedEbitda,
    netDebt,
    grossDebt: fromBalance ? grossDebt : null,
    cash: fromBalance ? cash : null,
    marketCap,
    marketCapCurrency: input.marketCapCurrency ?? null,
    notes,
  };
}

/** Preço alvo por múltiplo. EV = equity + dívida − caixa. */
export function estimateIntrinsic(input: IntrinsicInput): IntrinsicEstimate {
  const targetEv =
    input.histAvgEvEbitda ?? input.peerMedianEvEbitda ?? null;
  const {
    price,
    ebitda,
    netDebt,
    marketCap,
    pe,
    histAvgPe,
    evEbitda,
  } = input;
  const grossDebt = input.totalDebt ?? null;
  const cash =
    grossDebt != null && netDebt != null ? grossDebt - netDebt : null;
  const targets = buildPriceTargets({
    price,
    marketCap,
    ebitda,
    netIncome: input.netIncome ?? null,
    totalEquity: input.totalEquity ?? null,
    netDebt,
    histEv: input.histAvgEvEbitda,
    sectorEv: input.peerMedianEvEbitda,
    histPe: histAvgPe,
    sectorPe: input.peerMedianPe ?? null,
    histPb: input.histAvgPb ?? null,
    sectorPb: input.peerMedianPb ?? null,
  });
  const headline =
    targets.find((t) => t.method === "EV/EBITDA" && t.source === "histórico") ??
    targets[0] ??
    null;
  const shownDebt = cash != null ? grossDebt : null;
  const shownCash = cash != null ? cash : null;
  const justo = buildJusto(input);

  if (headline && price != null) {
    return {
      method: `${headline.method} ${headline.source}`,
      marketPrice: price,
      fairPrice: headline.price,
      upsidePct: headline.upsidePct,
      targetMultiple: headline.multiple,
      currentMultiple: evEbitda ?? pe,
      justo,
      targets,
      ebitda,
      netDebt,
      grossDebt: shownDebt,
      cash: shownCash,
      marketCap,
      marketCapCurrency: input.marketCapCurrency ?? null,
      notes:
        "EV = equity + dívida − caixa. EV/EBITDA: múltiplo × EBITDA = EV. " +
        "Equity = EV − dívida líquida. P/L: lucro × P/L. P/BV: patrimônio × P/BV. " +
        "Preço alvo = preço × equity ÷ market cap.",
    };
  }

  return {
    method: "Indisponível",
    marketPrice: price,
    fairPrice: null,
    upsidePct: null,
    targetMultiple: targetEv,
    currentMultiple: evEbitda ?? pe,
    justo,
    targets,
    ebitda,
    netDebt,
    grossDebt: null,
    cash: null,
    marketCap,
    marketCapCurrency: input.marketCapCurrency ?? null,
    notes: "Faltam EBITDA, lucro ou patrimônio para estimar o preço alvo.",
  };
}

export { median, avg, finite };
