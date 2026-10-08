import { describe, expect, it } from "vitest";
import {
  buildAnnualPoints,
  buildFiscalSeries,
  lastPointPerYear,
  parseQuarter,
  pickEvolutionSeries,
  seriesFromAnnual,
} from "../bottom-up-series";
import type { SeriesPoint } from "../bottom-up-types";

function pt(date: string, extra: Partial<SeriesPoint> = {}): SeriesPoint {
  return {
    date,
    roe: null,
    roic: null,
    ebitdaMargin: null,
    netMargin: null,
    netDebtEbitda: null,
    freeCashFlow: null,
    peRatio: null,
    evEbitda: null,
    price: null,
    ...extra,
  };
}

describe("parseQuarter", () => {
  it("lê Q1, 1Q, 1T23 e 2025Q2", () => {
    expect(parseQuarter("QUARTERLY", "Q1 2024")).toBe(1);
    expect(parseQuarter("quarter", "1Q24")).toBe(1);
    expect(parseQuarter(null, "3T25")).toBe(3);
    expect(parseQuarter("QUARTERLY", "2025Q2")).toBe(2);
    expect(parseQuarter("QUARTERLY", "2026Q1")).toBe(1);
  });

  it("ignora período anual", () => {
    expect(parseQuarter("ANNUAL", "2024")).toBeNull();
  });
});

describe("buildAnnualPoints", () => {
  it("prefere o ponto anual no mesmo ano", () => {
    const out = buildAnnualPoints([
      { period_year: 2024, period_type: "quarter", ebitda: 10, revenue: 100 },
      { period_year: 2024, period_type: "annual", ebitda: 40, revenue: 200 },
      { period_year: 2025, period_type: "annual", ebitda: 50, revenue: 220 },
    ]);
    expect(out.map((p) => p.year)).toEqual([2024, 2025]);
    expect(out[0]?.ebitda).toBe(40);
  });
});

describe("buildFiscalSeries", () => {
  it("usa trimestres quando existem", () => {
    const out = buildFiscalSeries([
      { period_year: 2024, period_type: "QUARTERLY", period_label: "Q1 2024", revenue: 50, ebitda: 10 },
      { period_year: 2024, period_type: "QUARTERLY", period_label: "Q2 2024", revenue: 60, ebitda: 12 },
      { period_year: 2024, period_type: "ANNUAL", period_label: "2024", revenue: 220, ebitda: 44 },
    ]);
    expect(out.map((p) => p.label)).toEqual(["1T24", "2T24"]);
    expect(out[0]?.ebitdaMargin).toBe(20);
  });

  it("lê o rótulo LSEG 2025Q2", () => {
    const out = buildFiscalSeries([
      { period_year: 2025, period_type: "QUARTERLY", period_label: "2025Q1", revenue: 50, ebitda: 10 },
      { period_year: 2025, period_type: "QUARTERLY", period_label: "2025Q2", revenue: 60, ebitda: 12 },
    ]);
    expect(out.map((p) => p.label)).toEqual(["1T25", "2T25"]);
  });

  it("cai para ano se não houver trimestre", () => {
    const out = buildFiscalSeries([
      { period_year: 2024, period_type: "ANNUAL", revenue: 100, ebitda: 20 },
      { period_year: 2025, period_type: "ANNUAL", revenue: 120, ebitda: 30 },
    ]);
    expect(out.map((p) => p.label)).toEqual(["2024", "2025"]);
  });

  it("preenche anos sem trimestre com o dado anual", () => {
    const out = buildFiscalSeries([
      { period_year: 2023, period_type: "ANNUAL", period_label: "2023", revenue: 80, ebitda: 16 },
      { period_year: 2024, period_type: "ANNUAL", period_label: "2024", revenue: 90, ebitda: 18 },
      { period_year: 2025, period_type: "ANNUAL", period_label: "2025", revenue: 220, ebitda: 44 },
      { period_year: 2025, period_type: "QUARTERLY", period_label: "2025Q1", revenue: 50, ebitda: 10 },
      { period_year: 2025, period_type: "QUARTERLY", period_label: "2025Q2", revenue: 60, ebitda: 12 },
    ]);
    expect(out.map((p) => p.label)).toEqual(["2023", "2024", "1T25", "2T25"]);
  });
});

describe("seriesFromAnnual", () => {
  it("calcula margens e dívida/EBITDA", () => {
    const s = seriesFromAnnual([
      {
        year: 2024,
        label: "2024",
        revenue: 200,
        ebitda: 40,
        netIncome: 20,
        freeCashFlow: 15,
        totalDebt: 80,
      },
    ]);
    expect(s[0]?.ebitdaMargin).toBe(20);
    expect(s[0]?.netMargin).toBe(10);
    expect(s[0]?.netDebtEbitda).toBe(2);
  });
});

describe("pickEvolutionSeries", () => {
  it("usa o histórico fiscal quando há 2+ pontos", () => {
    const fiscal = seriesFromAnnual([
      {
        year: 2024,
        label: "2024",
        revenue: 100,
        ebitda: 20,
        netIncome: 10,
        freeCashFlow: null,
        totalDebt: null,
      },
      {
        year: 2025,
        label: "2025",
        revenue: 120,
        ebitda: 30,
        netIncome: 12,
        freeCashFlow: null,
        totalDebt: null,
      },
    ]);
    const picked = pickEvolutionSeries(
      [pt("2026-01-01", { ebitdaMargin: 19 }), pt("2026-06-01", { ebitdaMargin: 19 })],
      fiscal,
      ["ebitdaMargin"]
    );
    expect(picked.map((p) => p.label)).toEqual(["2024", "2025"]);
  });

  it("não devolve série de um ano só", () => {
    const picked = pickEvolutionSeries(
      [pt("2026-01-15", { roe: 38 }), pt("2026-08-15", { roe: 38 })],
      [],
      ["roe"]
    );
    expect(picked).toEqual([]);
  });
});

describe("lastPointPerYear", () => {
  it("fica com o último ponto do ano", () => {
    const out = lastPointPerYear([
      pt("2025-01-01", { roe: 10 }),
      pt("2025-12-01", { roe: 12 }),
      pt("2026-03-01", { roe: 14 }),
    ]);
    expect(out.map((p) => `${p.date}:${p.roe}`)).toEqual([
      "2025-12-01:12",
      "2026-03-01:14",
    ]);
  });
});
