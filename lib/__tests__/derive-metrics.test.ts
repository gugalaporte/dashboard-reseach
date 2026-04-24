import { describe, it, expect } from "vitest";
import { deriveNetIncomeFromEPS } from "../derive-metrics";

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
