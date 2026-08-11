/** Cálculos puros: bandas de múltiplos e preço justo simples. */

import type {
  IntrinsicEstimate,
  MultipleBand,
  SeriesPoint,
} from "./bottom-up-types";

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
  netDebt: number | null;
  marketCap: number | null;
  histAvgEvEbitda: number | null;
  peerMedianEvEbitda: number | null;
  histAvgPe: number | null;
};

/**
 * Preço justo: múltiplo-alvo (média histórica ou mediana setorial) × EBITDA,
 * menos dívida líquida, dividido pelas ações implícitas (mkt cap / preço).
 * Fallback: preço × (P/E médio histórico / P/E atual).
 */
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

  // Método principal: EV/EBITDA alvo
  if (
    targetEv != null &&
    ebitda != null &&
    ebitda > 0 &&
    price != null &&
    price > 0 &&
    marketCap != null &&
    marketCap > 0
  ) {
    const fairEv = targetEv * ebitda;
    const equity = fairEv - (netDebt ?? 0);
    const shares = marketCap / price;
    const fairPrice = shares > 0 ? equity / shares : null;
    const upsidePct =
      fairPrice != null && price > 0
        ? ((fairPrice - price) / price) * 100
        : null;

    return {
      method: "Múltiplo-alvo EV/EBITDA",
      marketPrice: price,
      fairPrice,
      upsidePct,
      targetMultiple: targetEv,
      currentMultiple: evEbitda,
      ebitda,
      netDebt,
      marketCap,
      notes:
        "EV justo = múltiplo-alvo × EBITDA atual; equity = EV − dívida líquida; preço = equity / ações implícitas.",
    };
  }

  // Fallback: re-rating pelo P/E médio histórico
  if (price != null && pe != null && pe > 0 && histAvgPe != null && histAvgPe > 0) {
    const fairPrice = price * (histAvgPe / pe);
    return {
      method: "Re-rating P/E histórico",
      marketPrice: price,
      fairPrice,
      upsidePct: ((fairPrice - price) / price) * 100,
      targetMultiple: histAvgPe,
      currentMultiple: pe,
      ebitda,
      netDebt,
      marketCap,
      notes: "Preço justo ≈ preço atual × (P/E médio histórico / P/E atual).",
    };
  }

  return {
    method: "Indisponível",
    marketPrice: price,
    fairPrice: null,
    upsidePct: null,
    targetMultiple: targetEv,
    currentMultiple: evEbitda ?? pe,
    ebitda,
    netDebt,
    marketCap,
    notes: "Faltam EBITDA, preço ou histórico de múltiplos para estimar.",
  };
}

export { median, avg, finite };
