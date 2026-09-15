import { describe, expect, it } from "vitest";
import {
  aggregateExecutions,
  buildRotationBuckets,
  buildRotationRows,
  detectRotationPairs,
  enrichExecutions,
  excludeStockConversions,
  executionValue,
  isListedEquityTicker,
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

describe("isListedEquityTicker", () => {
  it("aceita ON, PN, unit e BDR", () => {
    expect(isListedEquityTicker("VALE3")).toBe(true);
    expect(isListedEquityTicker("PETR4")).toBe(true);
    expect(isListedEquityTicker("BPAC11")).toBe(true);
    expect(isListedEquityTicker("INBR32")).toBe(true);
  });

  it("rejeita recibo e direito (distorcem o volume)", () => {
    expect(isListedEquityTicker("AZUL53")).toBe(false);
    expect(isListedEquityTicker("AZUL54")).toBe(false);
    expect(isListedEquityTicker("AXIA13")).toBe(false);
    expect(isListedEquityTicker("PETR1")).toBe(false);
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

  it("ignora recibo AZUL53 no volume", () => {
    const base = aggregateExecutions([
      row({ product: "AZUL53", amount: "604765000", price: "109659" }),
      row({ product: "VALE3", amount: "-100", price: "80" }),
    ]);
    expect(base).toHaveLength(1);
    expect(base[0].ric).toBe("VALE3");
  });
});

describe("excludeStockConversions", () => {
  it("remove conversão AXIA6→AXIA3 no mesmo dia com notional igual", () => {
    const base = aggregateExecutions([
      row({
        trade_date: "06/08/2026",
        product: "AXIA6",
        amount: "-657696",
        price: "55.78",
        trading_desk: "FINACAP MAURI",
        book: "Energia Elétrica",
      }),
      row({
        trade_date: "06/08/2026",
        product: "AXIA3",
        amount: "723465",
        price: "50.71",
        trading_desk: "FINACAP MAURI",
        book: "Energia Elétrica",
      }),
      row({ product: "VALE3", amount: "-100", price: "80" }),
    ]);
    const out = excludeStockConversions(base);
    expect(out).toHaveLength(1);
    expect(out[0].ric).toBe("VALE3");
  });

  it("mantém rotação real entre papéis diferentes", () => {
    const base = aggregateExecutions([
      row({ product: "VALE3", amount: "-1000", price: "80" }),
      row({ product: "PETR4", amount: "1000", price: "30" }),
    ]);
    expect(excludeStockConversions(base)).toHaveLength(2);
  });

  it("remove conversão de ticker ELET6→AXIA6 (mesma qtd e preço)", () => {
    const base = aggregateExecutions([
      row({
        trade_date: "11/10/2025",
        product: "ELET6",
        amount: "-680196",
        price: "61.94",
        trading_desk: "FINACAP MAURITSSTAD FIF - CIA",
      }),
      row({
        trade_date: "11/10/2025",
        product: "AXIA6",
        amount: "680196",
        price: "61.94",
        trading_desk: "FINACAP MAURITSSTAD FIF - CIA",
      }),
      row({
        trade_date: "11/10/2025",
        product: "ITUB3",
        amount: "-100",
        price: "35",
        trading_desk: "FINACAP MAURITSSTAD FIF - CIA",
      }),
    ]);
    const out = excludeStockConversions(base);
    expect(out).toHaveLength(1);
    expect(out[0].ric).toBe("ITUB3");
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
