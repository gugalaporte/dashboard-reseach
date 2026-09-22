import type { TradeSide, TradeTarget } from "./trade-targets";

/** Único fundo desta tabela de metas. */
export const MAURITSSTAD_DESK = "FINACAP MAURITSSTAD FIF - CIA";

export type TargetFillTrade = {
  ric: string;
  side: TradeSide;
  tradingDesk: string;
  tradeDateIso: string;
  qty: number;
  notional: number;
};

function normTicker(v: string): string {
  return v.trim().toUpperCase().replace(/\.SA$/, "");
}

export function isMauritsstadDesk(desk: string): boolean {
  return desk.trim().toUpperCase() === MAURITSSTAD_DESK.toUpperCase();
}

export function targetProgress(
  target: Pick<
    TradeTarget,
    "ticker" | "side" | "amountType" | "amount" | "startDate" | "dueDate"
  >,
  trades: TargetFillTrade[]
): { remaining: number | null; avgPrice: number | null } {
  if (!target.startDate || !target.dueDate) {
    return { remaining: null, avgPrice: null };
  }

  let qty = 0;
  let notional = 0;
  const ticker = normTicker(target.ticker);

  for (const t of trades) {
    if (!isMauritsstadDesk(t.tradingDesk)) continue;
    if (normTicker(t.ric) !== ticker) continue;
    if (t.side !== target.side) continue;
    if (t.tradeDateIso < target.startDate || t.tradeDateIso > target.dueDate) continue;
    qty += t.qty;
    notional += t.notional;
  }

  const filled = target.amountType === "qty" ? qty : notional;
  return {
    remaining: target.amount - filled,
    avgPrice: qty > 0 ? notional / qty : null,
  };
}

export function attachTargetProgress(
  targets: TradeTarget[],
  trades: TargetFillTrade[]
): TradeTarget[] {
  return targets.map((target) => ({ ...target, ...targetProgress(target, trades) }));
}

/** Lucro/prejuízo vs o preço médio da execução no intervalo. */
export function targetPnl(
  side: TradeSide,
  avgPrice: number | null,
  currentPrice: number | null
): number | null {
  if (avgPrice == null || avgPrice <= 0 || currentPrice == null || currentPrice <= 0) {
    return null;
  }
  return side === "buy"
    ? ((currentPrice - avgPrice) / avgPrice) * 100
    : ((avgPrice - currentPrice) / avgPrice) * 100;
}

export function attachMarketMarks(
  targets: TradeTarget[],
  lastCloseByTicker: Map<string, number>
): TradeTarget[] {
  return targets.map((target) => {
    const currentPrice = lastCloseByTicker.get(normTicker(target.ticker)) ?? null;
    return {
      ...target,
      currentPrice,
      pnlPct: targetPnl(target.side, target.avgPrice, currentPrice),
    };
  });
}

export function earliestStart(targets: Array<{ startDate: string | null }>): string | null {
  let min: string | null = null;
  for (const t of targets) {
    if (!t.startDate) continue;
    if (!min || t.startDate < min) min = t.startDate;
  }
  return min;
}

export function uniqueTickers(targets: Array<{ ticker: string }>): string[] {
  return [...new Set(targets.map((t) => normTicker(t.ticker)).filter(Boolean))];
}
