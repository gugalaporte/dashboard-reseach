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
  /** EV do LSEG. O EBITDA da fórmula sai daqui, não da coluna ebitda. */
  enterpriseValue: number | null;
  netDebt: number | null;
  marketCap: number | null;
  marketCapCurrency?: string | null;
  histAvgEvEbitda: number | null;
  peerMedianEvEbitda: number | null;
  histAvgPe: number | null;
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

/**
 * Preço justo: múltiplo-alvo × EBITDA implícito no múltiplo atual.
 * EBITDA = EV ÷ EV/EBITDA atual. Equity = EV justo − dívida dessa mesma base.
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
  const basis = evOnMultipleBasis(input);
  const impliedEbitda =
    basis != null && evEbitda != null && evEbitda > 0 ? basis.ev / evEbitda : null;

  // Método principal: EV/EBITDA alvo, na mesma base do múltiplo
  if (
    targetEv != null &&
    impliedEbitda != null &&
    impliedEbitda > 0 &&
    basis != null &&
    price != null &&
    price > 0 &&
    marketCap != null &&
    marketCap > 0
  ) {
    const fairEv = targetEv * impliedEbitda;
    const equity = fairEv - basis.netDebt;
    // market cap ÷ preço não é o número de ações quando o cap mistura classes.
    const fairPrice = (price * equity) / marketCap;
    const upsidePct =
      fairPrice != null && price > 0
        ? ((fairPrice - price) / price) * 100
        : null;
    const alvo =
      input.histAvgEvEbitda != null
        ? "média histórica do EV/EBITDA"
        : "mediana do EV/EBITDA do setor";
    const usaEv =
      input.enterpriseValue != null && input.enterpriseValue > 0;
    const evFonte = usaEv
      ? "enterprise value ÷ EV/EBITDA atual"
      : "(market cap + dívida líquida) ÷ EV/EBITDA atual";
    const divida = usaEv ? "enterprise value − market cap" : "dívida líquida";

    return {
      method: "Múltiplo-alvo EV/EBITDA",
      marketPrice: price,
      fairPrice,
      upsidePct,
      targetMultiple: targetEv,
      currentMultiple: evEbitda,
      ebitda: impliedEbitda,
      netDebt: basis.netDebt,
      marketCap,
      marketCapCurrency: input.marketCapCurrency ?? null,
      notes:
        `EBITDA implícito = ${evFonte}, para o múltiplo e o EBITDA ficarem na mesma base. ` +
        `EV justo = ${alvo} × esse EBITDA. Equity = EV justo − (${divida}). ` +
        "Preço = preço × equity ÷ market cap.",
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
      marketCapCurrency: input.marketCapCurrency ?? null,
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
    marketCapCurrency: input.marketCapCurrency ?? null,
    notes: "Faltam EBITDA, preço ou histórico de múltiplos para estimar.",
  };
}

export { median, avg, finite };
