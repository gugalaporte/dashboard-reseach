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
  it("estima preço justo via EV/EBITDA alvo", () => {
    const est = estimateIntrinsic({
      price: 10,
      pe: 8,
      evEbitda: 5,
      ebitda: 200,
      netDebt: 100,
      marketCap: 1000,
      histAvgEvEbitda: 6,
      peerMedianEvEbitda: 7,
      histAvgPe: 10,
    });
    // fair EV = 6 * 200 = 1200; equity = 1100; shares = 100; fair = 11
    expect(est.method).toBe("Múltiplo-alvo EV/EBITDA");
    expect(est.fairPrice).toBeCloseTo(11, 5);
    expect(est.upsidePct).toBeCloseTo(10, 5);
  });

  it("usa fallback P/E quando falta EBITDA", () => {
    const est = estimateIntrinsic({
      price: 20,
      pe: 10,
      evEbitda: null,
      ebitda: null,
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
