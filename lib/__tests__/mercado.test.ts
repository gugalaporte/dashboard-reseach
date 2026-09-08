import { describe, expect, it } from "vitest";
import {
  addDays,
  buildMarketPayload,
  dayReturn,
  indexTo100,
  periodReturn,
  tenorMonths,
  type MarketInst,
} from "../mercado";

describe("tenorMonths", () => {
  it("converte 1Y3M e 10Y", () => {
    expect(tenorMonths("1Y3M")).toBe(15);
    expect(tenorMonths("10Y")).toBe(120);
    expect(tenorMonths("3M")).toBe(3);
  });
});

describe("periodReturn", () => {
  const series = [
    { date: "2026-08-03", value: 100 },
    { date: "2026-08-10", value: 110 },
    { date: "2026-09-02", value: 120 },
  ];
  it("usa o ponto em ou antes do lookback", () => {
    expect(periodReturn(series, 30)).toBeCloseTo(20, 5);
  });
  it("1D usa o pregão anterior", () => {
    expect(dayReturn(series)).toBeCloseTo((120 / 110 - 1) * 100, 5);
  });
});

describe("indexTo100", () => {
  it("normaliza o primeiro valor para 100", () => {
    const out = indexTo100([
      { date: "a", value: 50 },
      { date: "b", value: 55 },
    ]);
    expect(out[0]?.value).toBe(100);
    expect(out[1]?.value).toBeCloseTo(110, 10);
  });
});

describe("addDays", () => {
  it("não quebra virada de mês", () => {
    expect(addDays("2026-09-01", -1)).toBe("2026-08-31");
  });
});

describe("buildMarketPayload", () => {
  it("calcula retorno e injeta IDEX sem série", () => {
    const inst: MarketInst[] = [
      {
        ric: ".BVSP",
        name: "Ibovespa",
        group_code: "equity",
        quote_type: "index_level",
        currency: "BRL",
        curve_id: null,
        tenor: null,
        enabled: true,
        notes: null,
      },
    ];
    const payload = buildMarketPayload(inst, [
      { ric: ".BVSP", trade_date: "2026-08-08", value: 100 },
      { ric: ".BVSP", trade_date: "2026-09-08", value: 110 },
    ]);
    const ibov = payload.rows.find((r) => r.ric === ".BVSP");
    const idex = payload.rows.find((r) => r.ric === "JGPIDEX");
    expect(ibov?.ret1m).toBeCloseTo(10, 5);
    expect(idex?.enabled).toBe(false);
    expect(payload.series[".BVSP"]?.length).toBe(2);
  });

  it("liga ETF Anbima ao índice e não inclui vértices de curva", () => {
    const inst: MarketInst[] = [
      {
        ric: "IMAB11=SA",
        name: "IMAB11",
        group_code: "fi_anbima",
        quote_type: "price",
        currency: "BRL",
        curve_id: null,
        tenor: null,
        enabled: true,
        notes: null,
      },
      {
        ric: "B5P211=SA",
        name: "B5P211",
        group_code: "fi_anbima",
        quote_type: "price",
        currency: "BRL",
        curve_id: null,
        tenor: null,
        enabled: true,
        notes: null,
      },
      {
        ric: "BR1YT=RR",
        name: "PRE 1A",
        group_code: "curve",
        quote_type: "yield_pct",
        currency: "BRL",
        curve_id: "BRBMK",
        tenor: "1Y",
        enabled: true,
        notes: null,
      },
    ];
    const payload = buildMarketPayload(inst, [
      { ric: "B5P211=SA", trade_date: "2026-08-08", value: 100 },
      { ric: "B5P211=SA", trade_date: "2026-09-08", value: 102 },
      { ric: "BR1YT=RR", trade_date: "2026-09-08", value: 14.1 },
    ]);
    const anbima = payload.rows.filter((r) => r.group === "fi_anbima");
    expect(anbima.map((r) => r.ric)).toEqual(["B5P211=SA", "IMAB11=SA"]);
    expect(anbima[0]?.tracks).toBe("IMA-B 5");
    expect(anbima[1]?.tracks).toBe("IMA-B");
    expect(payload.series["B5P211=SA"]?.length).toBe(2);
    expect(payload.rows.some((r) => r.group === "curve")).toBe(false);
    expect(payload.curves[0]?.points[0]?.now).toBe(14.1);
  });
});
