import { describe, expect, it } from "vitest";
import { evFairSteps } from "../fair-price-steps";
import type { IntrinsicEstimate } from "../bottom-up-types";

function step(label: string, estimate: IntrinsicEstimate): string {
  const found = evFairSteps(estimate)?.find((s) => s.label === label);
  if (!found) throw new Error(`passo ausente: ${label}`);
  return found.value;
}

describe("evFairSteps", () => {
  const petr4: IntrinsicEstimate = {
    method: "Múltiplo-alvo EV/EBITDA",
    marketPrice: 56,
    fairPrice: 37.893276122670564,
    upsidePct: -32.33,
    targetMultiple: 2.7473310667353408,
    currentMultiple: 3.56849507085573,
    ebitda: 304886000000,
    netDebt: 313673000000,
    grossDebt: null,
    cash: null,
    marketCap: 774311188172.92,
    marketCapCurrency: "BRL",
    notes: "",
  };

  it("mostra a conta da PETR4 com os valores que fecham o preço", () => {
    expect(step("Enterprise value", petr4)).toBe("R$ 1.087,984 bi");
    expect(step("EBITDA implícito", petr4)).toBe(
      "1.087,984 bi ÷ 3,56850 = 304,886 bi"
    );
    expect(step("EV justo", petr4)).toBe(
      "2,74733 × 304,886 bi = 837,623 bi"
    );
    expect(step("Dívida líquida implícita (EV − market cap)", petr4)).toBe(
      "1.087,984 bi − 774,311 bi = 313,673 bi"
    );
    expect(step("Equity", petr4)).toBe(
      "837,623 bi − 313,673 bi = 523,950 bi"
    );
    expect(evFairSteps(petr4)?.some((s) => s.label === "Ações")).toBe(false);
    expect(step("Preço justo", petr4)).toBe(
      "R$ 56,00 × 523,950 ÷ 774,311 = R$ 37,89"
    );
  });

  it("não monta passos no fallback de P/E", () => {
    expect(
      evFairSteps({
        ...petr4,
        method: "Re-rating P/E histórico",
      })
    ).toBeNull();
  });
});
