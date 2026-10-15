import type { IntrinsicEstimate } from "./bottom-up-types";
import { formatNumber } from "./format";

export type FairStep = { label: string; value: string };

type Scale = { div: number; suffix: string; digits: number };

function scaleOf(values: number[]): Scale {
  const max = Math.max(...values.map((v) => Math.abs(v)), 0);
  if (max >= 1e9) return { div: 1e9, suffix: " bi", digits: 3 };
  if (max >= 1e6) return { div: 1e6, suffix: " mi", digits: 1 };
  return { div: 1, suffix: "", digits: 2 };
}

function scaled(v: number, scale: Scale): string {
  return formatNumber(v / scale.div, scale.digits);
}

function amount(v: number, scale: Scale): string {
  return `${scaled(v, scale)}${scale.suffix}`;
}

function reais(v: number, scale: Scale): string {
  return `R$ ${amount(v, scale)}`;
}

/** 5 casas: com 2 o arredondamento não reproduz o preço. */
function multiple(v: number): string {
  return formatNumber(v, 5);
}

/**
 * Passos do preço justo com os números da conta.
 * Bilhões em 3 casas e múltiplo em 5, para cada igualdade fechar.
 */
export function evFairSteps(estimate: IntrinsicEstimate): FairStep[] | null {
  if (estimate.method !== "Múltiplo-alvo EV/EBITDA") return null;

  const {
    ebitda,
    netDebt,
    grossDebt,
    cash,
    marketCap,
    marketPrice,
    targetMultiple,
    currentMultiple,
    fairPrice,
  } = estimate;
  if (
    ebitda == null ||
    netDebt == null ||
    marketCap == null ||
    marketPrice == null ||
    marketPrice <= 0 ||
    targetMultiple == null ||
    currentMultiple == null ||
    currentMultiple <= 0 ||
    fairPrice == null
  ) {
    return null;
  }

  const ev = currentMultiple * ebitda;
  const fairEv = targetMultiple * ebitda;
  const equity = fairEv - netDebt;
  const scale = scaleOf([
    ev,
    fairEv,
    equity,
    ebitda,
    netDebt,
    marketCap,
    grossDebt ?? 0,
    cash ?? 0,
  ]);
  const evTxt = amount(ev, scale);
  const ebitdaTxt = amount(ebitda, scale);
  const fairEvTxt = amount(fairEv, scale);
  const debtTxt = amount(Math.abs(netDebt), scale);
  const equityTxt = amount(equity, scale);
  const capTxt = amount(marketCap, scale);
  const priceTxt = `R$ ${formatNumber(marketPrice, 2)}`;
  const debtOp = netDebt < 0 ? "+" : "−";
  const fromBalance = grossDebt != null && cash != null;
  const impliedDebt = !fromBalance && !estimate.notes.includes("dívida líquida");

  return [
    { label: "Enterprise value", value: reais(ev, scale) },
    {
      label: "EBITDA implícito",
      value: `${evTxt} ÷ ${multiple(currentMultiple)} = ${ebitdaTxt}`,
    },
    {
      label: "EV justo",
      value: `${multiple(targetMultiple)} × ${ebitdaTxt} = ${fairEvTxt}`,
    },
    {
      label: fromBalance
        ? "Dívida líquida"
        : impliedDebt
          ? "Dívida líquida implícita (EV − market cap)"
          : "Dívida líquida",
      value: fromBalance
        ? `${amount(grossDebt, scale)} − ${amount(cash, scale)} = ${amount(netDebt, scale)}`
        : `${evTxt} − ${capTxt} = ${amount(netDebt, scale)}`,
    },
    {
      label: "Equity",
      value: `${fairEvTxt} ${debtOp} ${debtTxt} = ${equityTxt}`,
    },
    {
      label: "Preço justo",
      value: `${priceTxt} × ${scaled(equity, scale)} ÷ ${scaled(marketCap, scale)} = R$ ${formatNumber(fairPrice, 2)}`,
    },
  ];
}
