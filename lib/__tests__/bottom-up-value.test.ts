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
  it("estima preço justo pelo EBITDA implícito no múltiplo", () => {
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
    // EBITDA = 1100 / 5 = 220; EV justo = 6 * 220 = 1320
    // dívida na base do EV = 1100 - 1000 = 100; equity = 1220; fair = 12,2
    expect(est.method).toBe("Múltiplo-alvo EV/EBITDA");
    expect(est.ebitda).toBeCloseTo(220, 5);
    expect(est.fairPrice).toBeCloseTo(12.2, 5);
    expect(est.upsidePct).toBeCloseTo(22, 5);
  });

  it("ignora a coluna ebitda quando ela não bate com o múltiplo", () => {
    const est = estimateIntrinsic({
      price: 10,
      pe: 8,
      evEbitda: 5,
      ebitda: 50,
      enterpriseValue: 1100,
      netDebt: 400,
      marketCap: 1000,
      histAvgEvEbitda: 6,
      peerMedianEvEbitda: null,
      histAvgPe: 10,
    });
    expect(est.ebitda).toBeCloseTo(220, 5);
    expect(est.netDebt).toBeCloseTo(100, 5);
    expect(est.fairPrice).toBeCloseTo(12.2, 5);
  });

  it("usa fallback P/E quando falta EBITDA", () => {
    const est = estimateIntrinsic({
      price: 20,
      pe: 10,
      evEbitda: null,
      ebitda: null,
      enterpriseValue: null,
      netDebt: null,
      marketCap: null,
      histAvgEvEbitda: null,
      peerMedianEvEbitda: null,
      histAvgPe: 12,
    });
    expect(est.method).toBe("Re-rating P/E histórico");
    expect(est.fairPrice).toBeCloseTo(24, 5);
  });
});
