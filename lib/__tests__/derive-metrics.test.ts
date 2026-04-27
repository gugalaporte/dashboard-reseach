import { describe, it, expect } from "vitest";
import {
  deriveCurrentPE,
  deriveEPSFromPriceAndPE,
  deriveNetIncomeFromEPS,
} from "../derive-metrics";

describe("deriveNetIncomeFromEPS", () => {
  it("publicado retorna direto sem derivado", () => {
    const r = deriveNetIncomeFromEPS({
      publishedNI: 900,
      anchorNI: 100,
      anchorPE: 10,
      anchorPrice: 50,
      anchorBank: "BTG Pactual",
      pe: 20,
      priceAtReport: 80,
      priceDate: "2026-01-15",
    });
    expect(r?.derived).toBe(false);
    expect(r?.source).toBe("published");
    expect(r?.value).toBe(900);
  });

  it("cross-anchor feliz (ex: PETR4 BBI derivado de BTG)", () => {
    // eps_anchor = 50/10 = 5, eps_other = 80/20 = 4 → NI = 100 * 4/5 = 80
    const r = deriveNetIncomeFromEPS({
      publishedNI: null,
      anchorNI: 100,
      anchorPE: 10,
      anchorPrice: 50,
      anchorBank: "BTG Pactual",
      pe: 20,
      priceAtReport: 80,
      priceDate: "2026-01-15",
    });
    expect(r?.derived).toBe(true);
    expect(r?.anchorBank).toBe("BTG Pactual");
    expect(r?.value).toBeCloseTo(80, 6);
  });

  it("null quando anchorNI e null", () => {
    const r = deriveNetIncomeFromEPS({
      publishedNI: null,
      anchorNI: null,
      anchorPE: 10,
      anchorPrice: 50,
      anchorBank: "BTG Pactual",
      pe: 20,
      priceAtReport: 80,
      priceDate: "2026-01-15",
    });
    expect(r).toBeNull();
  });

  it("null quando anchorPE e zero", () => {
    const r = deriveNetIncomeFromEPS({
      publishedNI: null,
      anchorNI: 100,
      anchorPE: 0,
      anchorPrice: 50,
      anchorBank: "BTG Pactual",
      pe: 20,
      priceAtReport: 80,
      priceDate: "2026-01-15",
    });
    expect(r).toBeNull();
  });

  it("null quando P/E da linha e zero", () => {
    const r = deriveNetIncomeFromEPS({
      publishedNI: null,
      anchorNI: 100,
      anchorPE: 10,
      anchorPrice: 50,
      anchorBank: "BTG Pactual",
      pe: 0,
      priceAtReport: 80,
      priceDate: "2026-01-15",
    });
    expect(r).toBeNull();
  });

  it("null quando priceAtReport e null", () => {
    const r = deriveNetIncomeFromEPS({
      publishedNI: null,
      anchorNI: 100,
      anchorPE: 10,
      anchorPrice: 50,
      anchorBank: "BTG Pactual",
      pe: 20,
      priceAtReport: null,
      priceDate: "2026-01-15",
    });
    expect(r).toBeNull();
  });
});

describe("deriveEPSFromPriceAndPE", () => {
  it("EPS publicado retorna valor e derived=false", () => {
    const r = deriveEPSFromPriceAndPE({
      publishedEPS: 3.5,
      priceAtReport: 45.83,
      pe: 9.5,
      peDate: "2026-01-10",
    });
    expect(r.derived).toBe(false);
    expect(r.value).toBe(3.5);
  });

  it("EPS null com preço e P/E válidos deriva price/pe", () => {
    const r = deriveEPSFromPriceAndPE({
      publishedEPS: null,
      priceAtReport: 45.83,
      pe: 9.5,
      peDate: "2026-01-10",
    });
    expect(r.derived).toBe(true);
    expect(r.value).toBeCloseTo(45.83 / 9.5, 6);
    expect(r.formula).toBe("Preço no report / P/E");
  });
});

describe("deriveCurrentPE", () => {
  it("ITUB4 exemplo: eps 4.82 e live 44.37 → ~9.2x", () => {
    const pe = deriveCurrentPE({ eps: 4.82, livePrice: 44.37 });
    expect(pe).not.toBeNull();
    expect(pe!).toBeCloseTo(9.2, 1);
  });
});
