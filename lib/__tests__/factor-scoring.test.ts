import { describe, expect, it } from "vitest";
import {
  classifyByPercentile,
  percentileRank,
  scoreFactors,
  zScore,
  type FactorInput,
} from "../factor-scoring";
import { buildFactorInputs, latestForwardByRic } from "../factor-build";

function base(partial: Partial<FactorInput> & Pick<FactorInput, "ticker" | "ric" | "sector">): FactorInput {
  return {
    name: partial.name ?? partial.ticker,
    asOfDate: "2026-07-01",
    roe: 15,
    netMargin: 10,
    ebitdaMargin: 20,
    currentRatio: 1.5,
    netDebtEbitda: 1.5,
    peRatio: 12,
    peFwd: null,
    pbRatio: 1.5,
    evEbitda: 6,
    upsidePct: 10,
    epsRev4wPct: 2,
    ret3m: 5,
    ret6m: 8,
    dividendYield: 4,
    dyFwd: null,
    marketCap: 50e9,
    dayVolume: 500_000,
    analystCount: 8,
    inPortfolio: false,
    ...partial,
  };
}

describe("zScore", () => {
  it("centraliza e escala", () => {
    expect(zScore(10, [8, 10, 12])).toBeCloseTo(0, 5);
  });
  it("retorna null se valor ausente", () => {
    expect(zScore(null, [1, 2, 3])).toBeNull();
  });
});

describe("percentileRank / class", () => {
  it("top = A, meio = B, fundo = C", () => {
    const scores = [1, 2, 3, 4];
    expect(classifyByPercentile(percentileRank(scores, 4))).toBe("A");
    expect(classifyByPercentile(percentileRank(scores, 2.5))).toBe("B");
    expect(classifyByPercentile(percentileRank(scores, 1))).toBe("C");
  });
});

describe("scoreFactors", () => {
  it("ranqueia elegíveis e marca inelegíveis", () => {
    const rows = scoreFactors(
      [
        base({ ticker: "AAA3", ric: "AAA3.SA", sector: "Energy", roe: 30, peRatio: 8 }),
        base({ ticker: "BBB3", ric: "BBB3.SA", sector: "Energy", roe: 10, peRatio: 20 }),
        base({
          ticker: "CCC3",
          ric: "CCC3.SA",
          sector: "Energy",
          dayVolume: 100,
          analystCount: 0,
        }),
      ],
      { minDayVolume: 20_000, maxNetDebtEbitda: 8 }
    );
    expect(rows.find((r) => r.ticker === "CCC3")?.eligible).toBe(false);
    const ranked = rows.filter((r) => r.eligible);
    expect(ranked).toHaveLength(2);
    expect(ranked[0]!.score!).toBeGreaterThanOrEqual(ranked[1]!.score!);
    expect(ranked.every((r) => r.factorClass != null)).toBe(true);
  });

  it("não corta banco por ND/EBITDA alto", () => {
    const rows = scoreFactors(
      [
        base({
          ticker: "ITUB4",
          ric: "ITUB4.SA",
          sector: "Banco Invest.",
          netDebtEbitda: 12,
          dayVolume: 1_000_000,
          analystCount: 9,
        }),
      ],
      { minDayVolume: 20_000, maxNetDebtEbitda: 8 }
    );
    expect(rows[0]!.eligible).toBe(true);
  });

  it("inverte métricas de valuation (menor P/E → z positivo relativo)", () => {
    const rows = scoreFactors([
      base({ ticker: "CHEAP", ric: "C.SA", sector: "Energy", peRatio: 5, peFwd: null }),
      base({ ticker: "EXPENSIVE", ric: "E.SA", sector: "Energy", peRatio: 30, peFwd: null }),
    ]);
    const cheap = rows.find((r) => r.ticker === "CHEAP")!;
    const exp = rows.find((r) => r.ticker === "EXPENSIVE")!;
    expect(cheap.value!).toBeGreaterThan(exp.value!);
  });
});

describe("latestForwardByRic", () => {
  it("escolhe as_of_date mais recente", () => {
    const map = latestForwardByRic([
      { ric: "X.SA", as_of_date: "2026-01-01", fiscal_year: 2026, eps_mean: 1, dps_mean: 1, pe_fwd: 10 },
      { ric: "X.SA", as_of_date: "2026-06-01", fiscal_year: 2026, eps_mean: 2, dps_mean: 1, pe_fwd: 9 },
    ]);
    expect(map.get("X.SA")?.pe_fwd).toBe(9);
  });
});

describe("buildFactorInputs", () => {
  it("faz join company + snapshot + forward", () => {
    const inputs = buildFactorInputs(
      [{ ticker: "VALE3", ric: "VALE3.SA", sector: "Materials", name: "Vale", gics_industry: null, updated_at: null }],
      [{
        ric: "VALE3.SA",
        as_of_date: "2026-07-01",
        last_price: 70,
        price_target: 80,
        rating_label: "Buy",
        upside_pct: 14,
        pe_ratio: 6,
        ev_ebitda: 4,
        dividend_yield: 8,
        revenue: 1,
        ebitda: 1,
        net_income: 1,
        roic: 10,
        roe: 20,
        day_volume: 1e6,
        analyst_count: 12,
        num_buys: 8,
        num_holds: 3,
        num_sells: 1,
      }],
      [{
        ric: "VALE3.SA",
        as_of_date: "2026-07-01",
        fiscal_year: 2026,
        eps_mean: 2,
        dps_mean: 1,
        pe_fwd: 5,
        dy_fwd: 9,
        eps_rev_4w_pct: 1.5,
      }]
    );
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.ticker).toBe("VALE3");
    expect(inputs[0]!.peFwd).toBe(5);
    expect(inputs[0]!.epsRev4wPct).toBe(1.5);
    expect(inputs[0]!.analystCount).toBe(12);
  });
});
