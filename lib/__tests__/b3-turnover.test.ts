import { describe, expect, it } from "vitest";
import { b3TurnoverToBrl, toB3Point } from "../b3-turnover";

describe("b3TurnoverToBrl", () => {
  it("já em reais permanece", () => {
    expect(b3TurnoverToBrl(25_000_000_000)).toBe(25_000_000_000);
  });

  it("escala milhão e bilhão", () => {
    expect(b3TurnoverToBrl(25_000)).toBe(25_000_000_000);
    expect(b3TurnoverToBrl(25)).toBe(25_000_000_000);
  });

  it("ignora zero e inválido", () => {
    expect(b3TurnoverToBrl(0)).toBe(0);
    expect(b3TurnoverToBrl(-1)).toBe(0);
  });
});

describe("toB3Point", () => {
  it("normaliza data e valor", () => {
    expect(toB3Point("2026-09-22T00:00:00", 30_000_000_000)).toEqual({
      tradeDateIso: "2026-09-22",
      notional: 30_000_000_000,
    });
  });
});
