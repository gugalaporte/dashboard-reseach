import { describe, expect, it } from "vitest";
import {
  aggregateExecutions,
  buildRotationBuckets,
  buildRotationRows,
  detectRotationPairs,
  enrichExecutions,
  executionValue,
  recomputeRotationPair,
  parseMovTradeDate,
  summaryStats,
  type MovAtivoRow,
  type DailyBar,
} from "../trade-analytics";

function row(partial: Partial<MovAtivoRow> & Pick<MovAtivoRow, "product" | "amount" | "price">): MovAtivoRow {
  return {
    id: 1,
    trade_date: "06/22/2026",
    productclass: "Equity",
    book: "Mineração",
    trader: "Test",
    financialsettle: "0",
    trading_desk: "ARRECIFES FIA",
    ...partial,
  };
}

describe("parseMovTradeDate", () => {
  it("converte MM/DD/YYYY", () => {
    expect(parseMovTradeDate("06/22/2026")).toBe("2026-06-22");
  });
});

describe("aggregateExecutions", () => {
  it("calcula preço médio ponderado por quantidade", () => {
    const base = aggregateExecutions([
      row({ product: "VALE3", amount: "-100", price: "80" }),
      row({ product: "VALE3", amount: "-100", price: "82" }),
    ]);
    expect(base).toHaveLength(1);
    expect(base[0].side).toBe("sell");
    expect(base[0].avgPrice).toBe(81);
  });

  it("separa compra e venda do mesmo papel", () => {
    const base = aggregateExecutions([
      row({ product: "BRAP4", amount: "1000", price: "20" }),
      row({ product: "VALE3", amount: "-1000", price: "80" }),
    ]);
    expect(base).toHaveLength(2);
  });
});

describe("enrichExecutions", () => {
  it("marca venda acima do fechamento como boa", () => {
    const base = aggregateExecutions([
      row({ product: "VALE3", amount: "-100", price: "82" }),
    ]);
    const bars = new Map<string, DailyBar[]>([
      [
        "VALE3",
        [
          {
            ric: "VALE3",
            tradeDate: "2026-06-22",
            open: 79,
            high: 83,
            low: 78,
            close: 80,
            volume: 1,
            typicalPrice: (83 + 78 + 80) / 3,
          },
        ],
      ],
    ]);
    const out = enrichExecutions(base, bars);
    expect(out[0].quality).toBe("good");
    expect(out[0].vsCloseBps!).toBeGreaterThan(0);
  });

  it("calcula resultado financeiro vs média do dia", () => {
    const typical = (83 + 78 + 80) / 3;
    const base = aggregateExecutions([
      row({ product: "VALE3", amount: "-100", price: "82" }),
    ]);
    const bars = new Map<string, DailyBar[]>([
      [
        "VALE3",
        [
          {
            ric: "VALE3",
            tradeDate: "2026-06-22",
            open: 79,
            high: 83,
            low: 78,
            close: 80,
            volume: 1,
            typicalPrice: typical,
          },
        ],
      ],
    ]);
    const out = enrichExecutions(base, bars);
    expect(out[0].vsTypicalValue).toBe(executionValue("sell", 82, typical, 100));
  });
});

describe("summaryStats", () => {
  it("soma volumes comprado, vendido e resultado financeiro", () => {
    const executions = enrichExecutions(
      aggregateExecutions([
        row({ product: "VALE3", amount: "-100", price: "80" }),
        row({ product: "BRAP4", amount: "200", price: "20" }),
      ]),
      new Map([
        [
          "VALE3",
          [
            {
              ric: "VALE3",
              tradeDate: "2026-06-22",
              open: 79,
              high: 83,
              low: 78,
              close: 80,
              volume: 1,
              typicalPrice: 80,
            },
          ],
        ],
        [
          "BRAP4",
          [
            {
              ric: "BRAP4",
              tradeDate: "2026-06-22",
              open: 19,
              high: 21,
              low: 19,
              close: 20,
              volume: 1,
              typicalPrice: 20,
            },
          ],
        ],
      ])
    );
    const stats = summaryStats(executions);
    expect(stats.sellNotional).toBe(8000);
    expect(stats.buyNotional).toBe(4000);
    expect(stats.totalVsTypicalValue).toBe(0);
  });
});

describe("detectRotationPairs", () => {
  it("emparelha venda e compra no mesmo dia", () => {
    const executions = enrichExecutions(
      aggregateExecutions([
        row({ product: "VALE3", amount: "-1000", price: "80", financialsettle: "80000" }),
        row({ product: "BRAP4", amount: "5000", price: "20", financialsettle: "-100000" }),
      ]),
      new Map()
    );
    const pairs = detectRotationPairs(executions);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].shortLeg).toBe("VALE3");
    expect(pairs[0].longLeg).toBe("BRAP4");
  });

  it("gera uma linha por dia e desk mesmo com varias vendas", () => {
    const executions = enrichExecutions(
      aggregateExecutions([
        row({ product: "VALE3", amount: "-1000", price: "80" }),
        row({ product: "PETR4", amount: "-500", price: "39" }),
        row({ product: "BRAP4", amount: "1000", price: "20" }),
        row({ product: "VIVT3", amount: "800", price: "33" }),
      ]),
      new Map()
    );
    const pairs = detectRotationPairs(executions);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].shortLeg).toBe("VALE3");
  });
});

describe("buildRotationBuckets", () => {
  it("lista opções por dia e desk sem parear automaticamente", () => {
    const bars = new Map<string, DailyBar[]>();
    const executions = enrichExecutions(
      aggregateExecutions([
        row({ product: "VALE3", amount: "-1000", price: "80" }),
        row({ product: "PETR4", amount: "-500", price: "39" }),
        row({ product: "BRAP4", amount: "1000", price: "20" }),
      ]),
      bars
    );
    const buckets = buildRotationBuckets(executions, bars, []);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].sellOptions).toHaveLength(2);
    expect(buckets[0].buyOptions).toHaveLength(1);
  });
});

describe("recomputeRotationPair", () => {
  it("recalcula retorno do par ao trocar pernas", () => {
    const bars = new Map<string, DailyBar[]>([
      [
        "VALE3",
        [
          {
            ric: "VALE3",
            tradeDate: "2026-06-22",
            open: 78,
            high: 82,
            low: 77,
            close: 80,
            volume: 1,
            typicalPrice: 80,
          },
          {
            ric: "VALE3",
            tradeDate: "2026-06-26",
            open: 84,
            high: 86,
            low: 83,
            close: 88,
            volume: 1,
            typicalPrice: 86,
          },
        ],
      ],
      [
        "BRAP4",
        [
          {
            ric: "BRAP4",
            tradeDate: "2026-06-22",
            open: 19,
            high: 21,
            low: 19,
            close: 20,
            volume: 1,
            typicalPrice: 20,
          },
          {
            ric: "BRAP4",
            tradeDate: "2026-06-26",
            open: 21,
            high: 22,
            low: 20,
            close: 22,
            volume: 1,
            typicalPrice: 21,
          },
        ],
      ],
      [
        "PETR4",
        [
          {
            ric: "PETR4",
            tradeDate: "2026-06-22",
            open: 38,
            high: 40,
            low: 37,
            close: 39,
            volume: 1,
            typicalPrice: 39,
          },
          {
            ric: "PETR4",
            tradeDate: "2026-06-26",
            open: 40,
            high: 41,
            low: 39,
            close: 40,
            volume: 1,
            typicalPrice: 40,
          },
        ],
      ],
    ]);

    const executions = enrichExecutions(
      aggregateExecutions([
        row({ product: "VALE3", amount: "-1000", price: "80" }),
        row({ product: "BRAP4", amount: "1000", price: "20" }),
        row({ product: "PETR4", amount: "500", price: "39" }),
      ]),
      bars
    );

    const [rotation] = buildRotationRows(executions, bars, []);
    const recomputed = recomputeRotationPair(rotation, "VALE3", "PETR4");

    expect(recomputed.shortLeg).toBe("VALE3");
    expect(recomputed.longLeg).toBe("PETR4");
    expect(recomputed.longReturnPct).not.toBeNull();
    expect(recomputed.pairReturnPct).not.toBeNull();
  });
});
