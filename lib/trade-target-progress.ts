import { MAURITSSTAD_DESK, type TradeSide, type TradeTarget } from "./trade-targets";

export { MAURITSSTAD_DESK };

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

/** Valor em reais como porcentagem do PL. */
export function navShare(value: number | null, fundNav: number | null): number | null {
  if (value == null || fundNav == null || !(fundNav > 0)) return null;
  return (value / fundNav) * 100;
}

/** Meta em reais. Porcentagem vira (pct / 100) × PL. */
export function targetGoalValue(
  target: Pick<TradeTarget, "amountType" | "amount">,
  fundNav: number | null
): number | null {
  if (target.amountType !== "pct") return target.amount;
  if (fundNav == null || !(fundNav > 0)) return null;
  return (target.amount / 100) * fundNav;
}

export function targetProgress(
  target: Pick<
    TradeTarget,
    "ticker" | "side" | "desk" | "amountType" | "amount" | "startDate" | "dueDate"
  >,
  trades: TargetFillTrade[],
  fundNav: number | null = null
): { filledQty: number | null; filledValue: number | null; remaining: number | null; avgPrice: number | null } {
  if (!target.startDate || !target.dueDate) {
    return { filledQty: null, filledValue: null, remaining: null, avgPrice: null };
  }

  let qty = 0;
  let notional = 0;
  const ticker = normTicker(target.ticker);
  const desk = (target.desk ?? MAURITSSTAD_DESK).trim().toUpperCase();

  for (const t of trades) {
    if (t.tradingDesk.trim().toUpperCase() !== desk) continue;
    if (normTicker(t.ric) !== ticker) continue;
    if (t.side !== target.side) continue;
    if (t.tradeDateIso < target.startDate || t.tradeDateIso > target.dueDate) continue;
    qty += t.qty;
    notional += t.notional;
  }

  const goal = targetGoalValue(target, fundNav);
  const filled = target.amountType === "qty" ? qty : notional;
  return {
    filledQty: qty,
    filledValue: notional,
    remaining: goal == null ? null : goal - filled,
    avgPrice: qty > 0 ? notional / qty : null,
  };
}

function navOf(navByDesk: ReadonlyMap<string, number>, desk: string): number | null {
  return navByDesk.get(desk.trim().toUpperCase()) ?? null;
}

export function attachFundNav(
  targets: TradeTarget[],
  navByDesk: ReadonlyMap<string, number>
): TradeTarget[] {
  return targets.map((target) => ({ ...target, fundNav: navOf(navByDesk, target.desk) }));
}

export function attachTargetProgress(
  targets: TradeTarget[],
  trades: TargetFillTrade[],
  navByDesk: ReadonlyMap<string, number> = new Map()
): TradeTarget[] {
  return targets.map((target) => {
    const fundNav = navOf(navByDesk, target.desk) ?? target.fundNav;
    return { ...target, fundNav, ...targetProgress(target, trades, fundNav) };
  });
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
