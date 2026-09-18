import { describe, expect, it } from "vitest";
import {
  parseAmount,
  parseAmountType,
  parseSide,
  parseTargetInput,
  parseTicker,
  rowToTarget,
} from "../trade-targets";

describe("parseTicker", () => {
  it("normaliza e aceita papel B3", () => {
    expect(parseTicker(" petr4 ")).toBe("PETR4");
    expect(parseTicker("BPAC11")).toBe("BPAC11");
  });

  it("rejeita vazio ou curto demais", () => {
    expect(parseTicker("")).toBe(null);
    expect(parseTicker("AB")).toBe(null);
    expect(parseTicker("PETR-4")).toBe(null);
  });
});

describe("parseAmount", () => {
  it("lê número, ponto e vírgula", () => {
    expect(parseAmount(1500)).toBe(1500);
    expect(parseAmount("10.000")).toBe(10000);
    expect(parseAmount("1.500,50")).toBe(1500.5);
    expect(parseAmount("1500.50")).toBe(1500.5);
  });

  it("rejeita zero e texto", () => {
    expect(parseAmount(0)).toBe(null);
    expect(parseAmount("-10")).toBe(null);
    expect(parseAmount("abc")).toBe(null);
    expect(parseAmount("")).toBe(null);
  });
});

describe("parseTargetInput", () => {
  it("monta o payload válido", () => {
    expect(
      parseTargetInput({
        ticker: "vale3",
        side: "buy",
        amountType: "qty",
        amount: "10.000",
      })
    ).toEqual({
      ticker: "VALE3",
      side: "buy",
      amountType: "qty",
      amount: 10000,
    });
  });

  it("rejeita lado inválido", () => {
    expect(
      parseTargetInput({
        ticker: "VALE3",
        side: "long",
        amountType: "qty",
        amount: 1,
      })
    ).toBe("side deve ser buy ou sell");
  });
});

describe("rowToTarget", () => {
  it("converte numeric do banco", () => {
    const t = rowToTarget({
      id: "abc",
      ticker: "pomo4",
      side: "sell",
      amount_type: "value",
      amount: "250000.00",
      created_at: "2026-09-18T12:00:00.000Z",
      updated_at: "2026-09-18T12:00:00.000Z",
    });
    expect(t.ticker).toBe("POMO4");
    expect(t.side).toBe("sell");
    expect(t.amountType).toBe("value");
    expect(t.amount).toBe(250000);
  });
});

describe("enums", () => {
  it("aceita qty/value e buy/sell", () => {
    expect(parseAmountType("qty")).toBe("qty");
    expect(parseAmountType("value")).toBe("value");
    expect(parseAmountType("shares")).toBe(null);
    expect(parseSide("buy")).toBe("buy");
    expect(parseSide("sell")).toBe("sell");
  });
});
