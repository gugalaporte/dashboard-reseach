import { describe, expect, it } from "vitest";
import {
  classifyByPercentile,
  percentileRank,
  scoreFactors,
  weightsFromPct,
  zScore,
  type FactorInput,
} from "../factor-scoring";
import { buildFactorInputs, latestForwardByRic } from "../factor-build";

function base(partial: Partial<FactorInput> & Pick<FactorInput, "ticker" | "ric" | "sector">): FactorInput {
  return {
    name: partial.name ?? partial.ticker,
    asOfDate: "2026-07-01",
    roe: 15,
    roic: 12,
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
    dayVolume: 2_000_000,
    analystCount: 8,
    revenueCagr: 10,
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
        base({ ticker: "AAA3", ric: "AAA3.SA", sector: "Energy", roic: 30, peRatio: 8 }),
        base({ ticker: "BBB3", ric: "BBB3.SA", sector: "Energy", roic: 10, peRatio: 20 }),
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

  it("empresa em carteira não cai por volume abaixo do mínimo", () => {
    const rows = scoreFactors(
      [
        base({
          ticker: "VTRU3",
          ric: "VTRU3.SA",
          sector: "Consumer",
          dayVolume: 100,
          inPortfolio: true,
        }),
      ],
      { minDayVolume: 1_000_000, maxNetDebtEbitda: 8 }
    );
    expect(rows[0]!.eligible).toBe(true);
  });

  it("fora da carteira ainda cai por volume baixo", () => {
    const rows = scoreFactors(
      [
        base({
          ticker: "FOO3",
          ric: "FOO3.SA",
          sector: "Consumer",
          dayVolume: 100,
          inPortfolio: false,
        }),
      ],
      { minDayVolume: 1_000_000, maxNetDebtEbitda: 8 }
    );
    expect(rows[0]!.eligible).toBe(false);
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

  it("peso maior em quality sobe empresa de ROIC alto", () => {
    const highQ = base({
      ticker: "HIGHQ",
      ric: "HQ.SA",
      sector: "Energy",
      roic: 40,
      revenueCagr: 25,
      dividendYield: 1,
      dyFwd: null,
    });
    const highC = base({
      ticker: "HIGHC",
      ric: "HC.SA",
      sector: "Energy",
      roic: 5,
      revenueCagr: 2,
      dividendYield: 12,
      dyFwd: null,
    });
    const equal = scoreFactors([highQ, highC]);
    const tilt = scoreFactors(
      [highQ, highC],
      { minDayVolume: 20_000, maxNetDebtEbitda: 8 },
      weightsFromPct({ quality: 80, value: 5, carry: 5, momentum: 10 })
    );
    const qEqual = equal.find((r) => r.ticker === "HIGHQ")!;
    const cEqual = equal.find((r) => r.ticker === "HIGHC")!;
    const qTilt = tilt.find((r) => r.ticker === "HIGHQ")!;
    const cTilt = tilt.find((r) => r.ticker === "HIGHC")!;
    expect(qTilt.score! - cTilt.score!).toBeGreaterThan(qEqual.score! - cEqual.score!);
  });

  it("inverte métricas de valuation (menor EV/EBITDA → z positivo relativo)", () => {
    const rows = scoreFactors([
      base({ ticker: "CHEAP", ric: "C.SA", sector: "Energy", evEbitda: 4 }),
      base({ ticker: "EXPENSIVE", ric: "E.SA", sector: "Energy", evEbitda: 12 }),
    ]);
    const cheap = rows.find((r) => r.ticker === "CHEAP")!;
    const exp = rows.find((r) => r.ticker === "EXPENSIVE")!;
    expect(cheap.value!).toBeGreaterThan(exp.value!);
  });

  it("compara o universo inteiro, não só o setor", () => {
    const energyCheap = base({
      ticker: "PETR4",
      ric: "PETR4.SA",
      sector: "Energy",
      evEbitda: 4,
    });
    const energyPeer = base({
      ticker: "PRIO3",
      ric: "PRIO3.SA",
      sector: "Energy",
      evEbitda: 6,
    });
    const retailExpensive = base({
      ticker: "LREN3",
      ric: "LREN3.SA",
      sector: "Retail",
      evEbitda: 14,
    });
    const all = scoreFactors([energyCheap, energyPeer, retailExpensive]);
    const onlyEnergy = scoreFactors([energyCheap, energyPeer]);
    const petrAll = all.find((r) => r.ticker === "PETR4")!;
    const petrEnergy = onlyEnergy.find((r) => r.ticker === "PETR4")!;
    expect(petrAll.value).not.toBeCloseTo(petrEnergy.value!, 8);
    expect(all.find((r) => r.ticker === "LREN3")!.value!).toBeLessThan(petrAll.value!);
  });

  it("não usa upside no fator Value", () => {
    const rows = scoreFactors([
      base({ ticker: "LOW", ric: "L.SA", sector: "Energy", upsidePct: 5 }),
      base({ ticker: "HIGH", ric: "H.SA", sector: "Energy", upsidePct: 200 }),
    ]);
    const low = rows.find((r) => r.ticker === "LOW")!;
    const high = rows.find((r) => r.ticker === "HIGH")!;
    expect(low.value).toBeCloseTo(high.value!, 8);
    expect(low.breakdown.some((b) => b.key === "upsidePct")).toBe(false);
  });

  it("ignora EV/EBITDA ≤ 0 no Value das não-financeiras", () => {
    const cheap = base({
      ticker: "CHEAP",
      ric: "C.SA",
      sector: "Energy",
      evEbitda: 4,
    });
    const expensive = base({
      ticker: "EXPENSIVE",
      ric: "E.SA",
      sector: "Energy",
      evEbitda: 12,
    });
    const loss = base({
      ticker: "LOSS",
      ric: "L.SA",
      sector: "Energy",
      evEbitda: -2,
    });

    const without = scoreFactors([cheap, expensive]);
    const withLoss = scoreFactors([cheap, expensive, loss]);
    const cheap0 = without.find((r) => r.ticker === "CHEAP")!;
    const cheap1 = withLoss.find((r) => r.ticker === "CHEAP")!;
    const lossRow = withLoss.find((r) => r.ticker === "LOSS")!;

    expect(cheap1.value).toBeCloseTo(cheap0.value!, 8);
    expect(lossRow.breakdown.find((b) => b.key === "evEbitda")?.z).toBeNull();
    expect(lossRow.breakdown.some((b) => b.key === "peFwd")).toBe(false);
    expect(cheap1.value!).toBeGreaterThan(lossRow.value ?? -Infinity);
  });

  it("banco usa só P/E fwd; demais usam só EV/EBITDA", () => {
    const bankCheap = base({
      ticker: "ITUB4",
      ric: "ITUB4.SA",
      sector: "Banks",
      peFwd: 6,
      evEbitda: 40,
    });
    const bankExp = base({
      ticker: "SANB11",
      ric: "SANB11.SA",
      sector: "Banks",
      peFwd: 12,
      evEbitda: 4,
    });
    const oilCheap = base({
      ticker: "PETR4",
      ric: "PETR4.SA",
      sector: "Energy",
      peFwd: 40,
      evEbitda: 3,
    });
    const oilExp = base({
      ticker: "PRIO3",
      ric: "PRIO3.SA",
      sector: "Energy",
      peFwd: 5,
      evEbitda: 10,
    });
    const rows = scoreFactors([bankCheap, bankExp, oilCheap, oilExp]);
    const itub = rows.find((r) => r.ticker === "ITUB4")!;
    const sanb = rows.find((r) => r.ticker === "SANB11")!;
    const petr = rows.find((r) => r.ticker === "PETR4")!;
    const prio = rows.find((r) => r.ticker === "PRIO3")!;

    expect(itub.value!).toBeGreaterThan(sanb.value!);
    expect(petr.value!).toBeGreaterThan(prio.value!);
    expect(itub.breakdown.filter((b) => b.factor === "value").map((b) => b.key)).toEqual([
      "peFwd",
    ]);
    expect(petr.breakdown.filter((b) => b.factor === "value").map((b) => b.key)).toEqual([
      "evEbitda",
    ]);
  });

  it("não-financeira usa só ROIC no Quality; banco usa só ROE", () => {
    const bankHigh = base({
      ticker: "ITUB4",
      ric: "ITUB4.SA",
      sector: "Banks",
      roe: 22,
      roic: 2,
      revenueCagr: 8,
    });
    const bankLow = base({
      ticker: "SANB11",
      ric: "SANB11.SA",
      sector: "Banks",
      roe: 8,
      roic: 40,
      revenueCagr: 8,
    });
    const oilHigh = base({
      ticker: "PETR4",
      ric: "PETR4.SA",
      sector: "Energy",
      roe: 5,
      roic: 30,
      revenueCagr: 8,
    });
    const oilLow = base({
      ticker: "PRIO3",
      ric: "PRIO3.SA",
      sector: "Energy",
      roe: 40,
      roic: 6,
      revenueCagr: 8,
    });
    const rows = scoreFactors([bankHigh, bankLow, oilHigh, oilLow]);
    const itub = rows.find((r) => r.ticker === "ITUB4")!;
    const sanb = rows.find((r) => r.ticker === "SANB11")!;
    const petr = rows.find((r) => r.ticker === "PETR4")!;
    const prio = rows.find((r) => r.ticker === "PRIO3")!;

    expect(itub.quality!).toBeGreaterThan(sanb.quality!);
    expect(petr.quality!).toBeGreaterThan(prio.quality!);
    expect(itub.breakdown.filter((b) => b.factor === "quality").map((b) => b.key)).toEqual([
      "roe",
      "revenueCagr",
    ]);
    expect(petr.breakdown.filter((b) => b.factor === "quality").map((b) => b.key)).toEqual([
      "roic",
      "revenueCagr",
    ]);
  });

  it("evolução da receita maior sobe o Quality quando o retorno é igual", () => {
    const grow = base({
      ticker: "GROW3",
      ric: "GROW3.SA",
      sector: "Energy",
      roic: 12,
      revenueCagr: 30,
    });
    const slow = base({
      ticker: "SLOW3",
      ric: "SLOW3.SA",
      sector: "Energy",
      roic: 12,
      revenueCagr: 2,
    });
    const rows = scoreFactors([grow, slow]);
    expect(rows.find((r) => r.ticker === "GROW3")!.quality!).toBeGreaterThan(
      rows.find((r) => r.ticker === "SLOW3")!.quality!
    );
  });

  it("momentum usa só retorno 3M", () => {
    const high = base({
      ticker: "HOT3",
      ric: "HOT3.SA",
      sector: "Energy",
      ret3m: 20,
      ret6m: -40,
      epsRev4wPct: -50,
    });
    const low = base({
      ticker: "COLD3",
      ric: "COLD3.SA",
      sector: "Energy",
      ret3m: -5,
      ret6m: 40,
      epsRev4wPct: 50,
    });
    const rows = scoreFactors([high, low]);
    const hot = rows.find((r) => r.ticker === "HOT3")!;
    const cold = rows.find((r) => r.ticker === "COLD3")!;
    expect(hot.momentum!).toBeGreaterThan(cold.momentum!);
    expect(hot.breakdown.filter((b) => b.factor === "momentum").map((b) => b.key)).toEqual([
      "ret3m",
    ]);
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
      }],
      [
        { ric: "VALE3.SA", as_of_date: "2026-07-01", period_type: "ANNUAL", period_year: 2023, period_label: "2023", revenue: 100, ebitda: 1, net_income: 1 },
        { ric: "VALE3.SA", as_of_date: "2026-07-01", period_type: "ANNUAL", period_year: 2024, period_label: "2024", revenue: 120, ebitda: 1, net_income: 1 },
        { ric: "VALE3.SA", as_of_date: "2026-07-01", period_type: "ANNUAL", period_year: 2025, period_label: "2025", revenue: 144, ebitda: 1, net_income: 1 },
      ]
    );
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.ticker).toBe("VALE3");
    expect(inputs[0]!.peFwd).toBe(5);
    expect(inputs[0]!.epsRev4wPct).toBe(1.5);
    expect(inputs[0]!.analystCount).toBe(12);
    expect(inputs[0]!.roic).toBe(10);
    expect(inputs[0]!.revenueCagr).toBeCloseTo(20, 5);
  });

  it("usa day_volume do snapshot anterior se o mais recente vier vazio", () => {
    const company = {
      ticker: "PETR4",
      ric: "PETR4.SA",
      sector: "Energy",
      name: "Petrobras",
      gics_industry: null,
      updated_at: null,
    };
    const baseSnap = {
      ric: "PETR4.SA",
      last_price: 48,
      price_target: 56,
      rating_label: "Buy",
      upside_pct: 16,
      pe_ratio: 6,
      ev_ebitda: 4,
      dividend_yield: 8,
      revenue: 1,
      ebitda: 1,
      net_income: 1,
      roic: 10,
      roe: 20,
      analyst_count: 12,
    };
    const inputs = buildFactorInputs(
      [company],
      [
        { ...baseSnap, as_of_date: "2026-09-17", day_volume: 23_808_400 },
        { ...baseSnap, as_of_date: "2026-09-18", day_volume: null },
      ],
      []
    );
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.asOfDate).toBe("2026-09-18");
    expect(inputs[0]!.dayVolume).toBe(23_808_400);
    expect(inputs[0]!.revenueCagr).toBeNull();
  });
});
