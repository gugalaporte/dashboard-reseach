import { describe, expect, it } from "vitest";
import {
  attachMarketMarks,
  attachTargetProgress,
  MAURITSSTAD_DESK,
  targetPnl,
  targetProgress,
  type TargetFillTrade,
} from "../trade-target-progress";
import type { TradeTarget } from "../trade-targets";

function trade(partial: Partial<TargetFillTrade> & Pick<TargetFillTrade, "qty" | "notional">): TargetFillTrade {
  return {
    ric: "PETR4",
    side: "buy",
    tradingDesk: MAURITSSTAD_DESK,
    tradeDateIso: "2026-09-10",
    ...partial,
  };
}

function target(partial: Partial<TradeTarget> = {}): TradeTarget {
  return {
    id: "1",
    ticker: "PETR4",
    side: "buy",
    amountType: "qty",
    amount: 10000,
    startDate: "2026-09-01",
    dueDate: "2026-09-30",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    remaining: null,
    avgPrice: null,
    currentPrice: null,
    pnlPct: null,
    ...partial,
  };
}

describe("targetProgress", () => {
  it("soma compras do papel no intervalo e calcula restante e VWAP", () => {
    const p = targetProgress(target(), [
      trade({ qty: 3000, notional: 3000 * 30 }),
      trade({ qty: 2000, notional: 2000 * 32, tradeDateIso: "2026-09-20" }),
    ]);
    expect(p.remaining).toBe(5000);
    expect(p.avgPrice).toBe(30.8);
  });

  it("em meta de valor desconta o financeiro executado", () => {
    const p = targetProgress(target({ amountType: "value", amount: 2_000_000 }), [
      trade({ qty: 1000, notional: 31_000 }),
    ]);
    expect(p.remaining).toBe(1_969_000);
    expect(p.avgPrice).toBe(31);
  });

  it("ignora outro lado, outro papel, outro fundo e fora do intervalo", () => {
    const p = targetProgress(target(), [
      trade({ side: "sell", qty: 4000, notional: 120_000 }),
      trade({ ric: "VALE3", qty: 4000, notional: 240_000 }),
      trade({ tradingDesk: "ARRECIFES FIA", qty: 4000, notional: 120_000 }),
      trade({ tradeDateIso: "2026-08-31", qty: 4000, notional: 120_000 }),
      trade({ tradeDateIso: "2026-10-01", qty: 4000, notional: 120_000 }),
    ]);
    expect(p.remaining).toBe(10000);
    expect(p.avgPrice).toBe(null);
  });

  it("sem datas não calcula", () => {
    const p = targetProgress(target({ startDate: null, dueDate: null }), [
      trade({ qty: 1000, notional: 30_000 }),
    ]);
    expect(p.remaining).toBe(null);
    expect(p.avgPrice).toBe(null);
  });
});

describe("attachTargetProgress", () => {
  it("preenche remaining e avgPrice em cada meta", () => {
    const [row] = attachTargetProgress([target()], [trade({ qty: 1000, notional: 30_000 })]);
    expect(row?.remaining).toBe(9000);
    expect(row?.avgPrice).toBe(30);
  });
});

describe("targetPnl", () => {
  it("compra lucra se o preço atual sobe", () => {
    expect(targetPnl("buy", 40, 50)).toBe(25);
  });

  it("venda lucra se o preço atual cai", () => {
    expect(targetPnl("sell", 40, 30)).toBe(25);
  });

  it("sem preço médio não calcula", () => {
    expect(targetPnl("buy", null, 50)).toBe(null);
  });
});

describe("attachMarketMarks", () => {
  it("preenche fechamento e %", () => {
    const [row] = attachMarketMarks(
      [target({ avgPrice: 40 })],
      new Map([["PETR4", 50]])
    );
    expect(row?.currentPrice).toBe(50);
    expect(row?.pnlPct).toBe(25);
  });
});
