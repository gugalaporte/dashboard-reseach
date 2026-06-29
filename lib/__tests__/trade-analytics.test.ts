import { describe, expect, it } from "vitest";
import {
  aggregateExecutions,
  detectRotationPairs,
  enrichExecutions,
  executionValue,
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
});
