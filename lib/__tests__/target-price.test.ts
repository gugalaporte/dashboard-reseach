import { describe, expect, it } from "vitest";
import { buildPriceTargets } from "../target-price";

describe("buildPriceTargets", () => {
  it("calcula EV/EBITDA, P/L e P/BV com o equity explícito", () => {
    const rows = buildPriceTargets({
      price: 10,
      marketCap: 1000,
      ebitda: 200,
      netIncome: 80,
      totalEquity: 500,
      netDebt: 100,
      histEv: 6,
      sectorEv: 5,
      histPe: 12,
      sectorPe: 10,
      histPb: 2,
      sectorPb: 1.5,
    });
    const ev = rows.find((r) => r.method === "EV/EBITDA" && r.source === "histórico");
    const pe = rows.find((r) => r.method === "P/L" && r.source === "histórico");
    const pb = rows.find((r) => r.method === "P/BV" && r.source === "setor");
    // EV = 6 × 200 = 1200; equity = 1100; preço = 11
    expect(ev?.price).toBeCloseTo(11, 5);
    // equity = 80 × 12 = 960; preço = 9,6
    expect(pe?.price).toBeCloseTo(9.6, 5);
    // equity = 500 × 1,5 = 750; preço = 7,5
    expect(pb?.price).toBeCloseTo(7.5, 5);
    expect(rows.map((r) => `${r.method} ${r.source}`)).toEqual([
      "EV/EBITDA histórico",
      "EV/EBITDA setor",
      "P/L histórico",
      "P/L setor",
      "P/BV histórico",
      "P/BV setor",
    ]);
  });
});
