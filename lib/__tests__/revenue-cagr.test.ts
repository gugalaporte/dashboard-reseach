import { describe, expect, it } from "vitest";
import {
  lastCompletedYear,
  revenueCagrByRic,
  twoYearRevenueCagrPct,
} from "../revenue-cagr";

describe("twoYearRevenueCagrPct", () => {
  it("100 para 144 em dois anos é 20%", () => {
    expect(twoYearRevenueCagrPct(100, 144)).toBeCloseTo(20, 8);
  });
  it("recusa receita zero ou negativa", () => {
    expect(twoYearRevenueCagrPct(0, 100)).toBeNull();
    expect(twoYearRevenueCagrPct(-10, 20)).toBeNull();
  });
});

describe("lastCompletedYear", () => {
  it("ignora o ano da data (exercício ainda aberto)", () => {
    expect(lastCompletedYear("2026-09-29")).toBe(2025);
  });
});

describe("revenueCagrByRic", () => {
  const annual = (
    ric: string,
    year: number,
    revenue: number,
    asOf = "2026-06-01"
  ) => ({
    ric,
    period_type: "ANNUAL",
    period_year: year,
    revenue,
    as_of_date: asOf,
  });

  it("usa os 3 últimos anos fechados e consecutivos", () => {
    const map = revenueCagrByRic(
      [
        annual("VALE3.SA", 2023, 100),
        annual("VALE3.SA", 2024, 110),
        annual("VALE3.SA", 2025, 144),
      ],
      2025
    );
    expect(map.get("VALE3.SA")).toBeCloseTo(20, 5);
  });

  it("exclui o ano corrente", () => {
    const map = revenueCagrByRic(
      [
        annual("SMTO3.SA", 2024, 100),
        annual("SMTO3.SA", 2025, 110),
        annual("SMTO3.SA", 2026, 200),
      ],
      2025
    );
    expect(map.has("SMTO3.SA")).toBe(false);
  });

  it("exige os três anos seguidos", () => {
    const map = revenueCagrByRic(
      [annual("GAP.SA", 2023, 100), annual("GAP.SA", 2025, 144)],
      2025
    );
    expect(map.has("GAP.SA")).toBe(false);
  });

  it("fica com o as_of mais recente do mesmo ano", () => {
    const map = revenueCagrByRic(
      [
        annual("X.SA", 2023, 100, "2026-01-01"),
        annual("X.SA", 2024, 110, "2026-01-01"),
        annual("X.SA", 2025, 121, "2026-01-01"),
        annual("X.SA", 2025, 144, "2026-09-01"),
      ],
      2025
    );
    expect(map.get("X.SA")).toBeCloseTo(20, 5);
  });
});
