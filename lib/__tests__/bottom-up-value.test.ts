import { describe, expect, it } from "vitest";
import {
  buildMultipleBands,
  estimateIntrinsic,
} from "../bottom-up-value";
import type { SeriesPoint } from "../bottom-up-types";

function pt(
  partial: Partial<SeriesPoint> & { date: string }
): SeriesPoint {
  return {
    roe: null,
    roic: null,
    ebitdaMargin: null,
    netMargin: null,
    netDebtEbitda: null,
    freeCashFlow: null,
    peRatio: null,
    evEbitda: null,
    price: null,
    ...partial,
  };
}

describe("buildMultipleBands", () => {
  it("calcula min/média/máx e mediana setorial", () => {
    const series = [
      pt({ date: "2020-01-01", peRatio: 8, evEbitda: 4 }),
      pt({ date: "2021-01-01", peRatio: 12, evEbitda: 6 }),
      pt({ date: "2022-01-01", peRatio: 10, evEbitda: 5 }),
    ];
    const bands = buildMultipleBands(series, 9, 4.5, [7, 11, 9], [5, 7, 6]);
    const pe = bands.find((b) => b.key === "pe")!;
    expect(pe.min).toBe(8);
    expect(pe.max).toBe(12);
    expect(pe.avg).toBe(10);
    expect(pe.current).toBe(9);
    expect(pe.peerMedian).toBe(9);
  });
});

describe("estimateIntrinsic", () => {
  it("estima o preço alvo com múltiplo × EBITDA", () => {
    const est = estimateIntrinsic({
      price: 10,
      pe: 8,
      evEbitda: 5,
      ebitda: 200,
      enterpriseValue: 1100,
      netDebt: 100,
      marketCap: 1000,
      histAvgEvEbitda: 6,
      peerMedianEvEbitda: 7,
      histAvgPe: 10,
    });
    // EV = 6 × 200 = 1200; equity = 1200 − 100 = 1100; preço = 10 × 1100 / 1000
    expect(est.method).toBe("EV/EBITDA histórico");
    expect(est.ebitda).toBe(200);
    expect(est.fairPrice).toBeCloseTo(11, 5);
    expect(est.upsidePct).toBeCloseTo(10, 5);
    expect(est.targets[0]?.method).toBe("EV/EBITDA");
    // Preço justo antigo: EBITDA implícito 1100 / 5 = 220; equity 1220; preço 12,2
    expect(est.justo?.ebitda).toBeCloseTo(220, 5);
    expect(est.justo?.fairPrice).toBeCloseTo(12.2, 5);
  });

  it("usa dívida menos caixa do balanço no equity", () => {
    const est = estimateIntrinsic({
      price: 10,
      pe: 8,
      evEbitda: 5,
      ebitda: 200,
      enterpriseValue: 1100,
      totalDebt: 250,
      netDebt: 80,
      marketCap: 1000,
      histAvgEvEbitda: 6,
      peerMedianEvEbitda: null,
      histAvgPe: 10,
    });
    // EV = 6 × 200 = 1200; equity = 1200 − 80 = 1120; preço = 11,2
    expect(est.grossDebt).toBe(250);
    expect(est.cash).toBeCloseTo(170, 5);
    expect(est.netDebt).toBeCloseTo(80, 5);
    expect(est.fairPrice).toBeCloseTo(11.2, 5);
    // Justo ainda usa o EBITDA implícito: EV 1320 − dívida 80 → preço 12,4
    expect(est.justo?.fairPrice).toBeCloseTo(12.4, 5);
    expect(est.justo?.cash).toBeCloseTo(170, 5);
  });

  it("usa o EBITDA do snapshot, não o implícito no múltiplo", () => {
    const est = estimateIntrinsic({
      price: 10,
      pe: 8,
      evEbitda: 5,
      ebitda: 50,
      enterpriseValue: 1100,
      netDebt: 40,
      marketCap: 1000,
      histAvgEvEbitda: 6,
      peerMedianEvEbitda: null,
      histAvgPe: 10,
    });
    // EV = 6 × 50 = 300; equity = 300 − 40 = 260; preço = 2,6
    expect(est.ebitda).toBe(50);
    expect(est.fairPrice).toBeCloseTo(2.6, 5);
    expect(est.justo?.ebitda).toBeCloseTo(220, 5);
    expect(est.justo?.netDebt).toBeCloseTo(100, 5);
    expect(est.justo?.fairPrice).toBeCloseTo(12.2, 5);
  });

  it("usa P/L explícito quando falta EBITDA", () => {
    const est = estimateIntrinsic({
      price: 20,
      pe: 10,
      evEbitda: null,
      ebitda: null,
      netIncome: 100,
      enterpriseValue: null,
      netDebt: null,
      marketCap: 1000,
      histAvgEvEbitda: null,
      peerMedianEvEbitda: null,
      histAvgPe: 12,
    });
    // equity = 100 × 12 = 1200; preço = 20 × 1200 / 1000 = 24
    expect(est.method).toBe("P/L histórico");
    expect(est.fairPrice).toBeCloseTo(24, 5);
    expect(est.justo).toBeNull();
  });
});
