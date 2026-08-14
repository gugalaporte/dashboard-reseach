import { describe, expect, it } from "vitest";
import {
  buildLsegRows,
  dedupeForward,
  latestSnapshots,
  ricToTicker,
} from "../lseg-transform";

const ALLOWED = ["PETR4", "VALE3"] as const;

describe("ricToTicker", () => {
  it("remove sufixo .SA", () => {
    expect(ricToTicker("PETR4.SA")).toBe("PETR4");
  });
});

describe("latestSnapshots", () => {
  it("mantém snapshot mais recente por ric", () => {
    const out = latestSnapshots([
      { ric: "VALE3.SA", as_of_date: "2026-06-22", last_price: 81, price_target: 86, rating_label: "Buy", upside_pct: 6, pe_ratio: 22, ev_ebitda: 5, dividend_yield: 9, revenue: 1, ebitda: 1, net_income: 1, roic: 7, roe: 13 },
      { ric: "VALE3.SA", as_of_date: "2026-06-29", last_price: 78, price_target: 86, rating_label: "Buy", upside_pct: 10, pe_ratio: 21, ev_ebitda: 5, dividend_yield: 9, revenue: 1, ebitda: 1, net_income: 1, roic: 7, roe: 13 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].last_price).toBe(78);
  });
});

describe("dedupeForward", () => {
  it("remove fiscal_year duplicado", () => {
    const out = dedupeForward([
      { ric: "VALE3.SA", fiscal_year: 2026, eps_mean: 1.9, dps_mean: 1, pe_fwd: null, dy_fwd: null },
      { ric: "VALE3.SA", fiscal_year: 2026, eps_mean: 2.0, dps_mean: 1, pe_fwd: null, dy_fwd: null },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].eps_mean).toBe(2);
  });
});

describe("buildLsegRows", () => {
  it("monta linha com rating e target", () => {
    const rows = buildLsegRows(
      {
        companies: [{ ticker: "VALE3", ric: "VALE3.SA", sector: "Materials", name: "Vale", gics_industry: null, updated_at: null }],
        snapshots: [{
          ric: "VALE3.SA", as_of_date: "2026-06-29", last_price: 78.35, price_target: 86.24,
          rating_label: "Buy", upside_pct: 10.35, pe_ratio: 21, ev_ebitda: 5, dividend_yield: 9,
          revenue: 213e9, ebitda: 80e9, net_income: 13e9, roic: 7, roe: 13,
        }],
        forward: [{ ric: "VALE3.SA", fiscal_year: 2026, eps_mean: 2, dps_mean: 1, pe_fwd: 10, dy_fwd: 8 }],
        historical: [{ ric: "VALE3.SA", as_of_date: "2026-06-29", period_type: "ANNUAL", period_year: 2025, period_label: "2025", revenue: 200e9, ebitda: 75e9, net_income: 12e9, free_cash_flow: 10e9, capex: -5e9, total_debt: 50e9 }],
      },
      ALLOWED
    );
    expect(rows[0].empresa).toBe("VALE3");
    expect(rows[0].fonte).toBe("LSEG");
    expect(rows[0].rating?.value).toBe("Buy");
    expect(rows[0].target?.value).toBe(86.24);
    expect(rows[0].byMetricYear?.eps?.["2026"]?.value).toBe(2);
    expect(rows[0].byMetricYear?.pe?.["2026"]?.value).toBe(10);
    expect(rows[0].byMetricYear?.revenue?.["2025"]?.value).toBe(200000);
  });

  it("inclui empresa em carteira mesmo sem snapshot LSEG", () => {
    const rows = buildLsegRows({
      companies: [
        {
          ticker: "VTRU3",
          ric: "VTRU3.SA",
          sector: "Consumer Discretionary",
          name: "Vitru Educacao SA",
          gics_industry: null,
          updated_at: null,
          in_portfolio: true,
        },
      ],
      snapshots: [],
      forward: [],
      historical: [],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].empresa).toBe("VTRU3");
    expect(rows[0].inPortfolio).toBe(true);
    expect(rows[0].name).toBe("Vitru Educacao SA");
  });

  it("omite empresa fora da carteira sem dados LSEG", () => {
    const rows = buildLsegRows({
      companies: [
        {
          ticker: "XXXX3",
          ric: "XXXX3.SA",
          sector: "Materials",
          name: "Fora",
          gics_industry: null,
          updated_at: null,
          in_portfolio: false,
        },
      ],
      snapshots: [],
      forward: [],
      historical: [],
    });
    expect(rows).toHaveLength(0);
  });
});
