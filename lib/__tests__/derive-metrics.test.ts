import { describe, it, expect } from "vitest";
import { deriveNetIncome } from "../derive-metrics";

describe("deriveNetIncome", () => {
  it("retorna valor publicado sem flag de derivado", () => {
    const r = deriveNetIncome({
      publishedNI: 900_000_000,
      priceAtReport: 31.65,
      priceDate: "2026-04-13",
      pe: 17.5,
      sharesOutstanding: 509_000_000,
    });
    expect(r?.derived).toBe(false);
    expect(r?.source).toBe("published");
    expect(r?.value).toBe(900_000_000);
  });

  it("calcula NI quando publicado e null (caso feliz ALOS3 BBI)", () => {
    // marketCap = 31.65 * 509_000_000 = 16.109.850.000
    // NI = 16.109.850.000 / 17.5 = 920.562.857,14
    const r = deriveNetIncome({
      publishedNI: null,
      priceAtReport: 31.65,
      priceDate: "2026-04-13",
      pe: 17.5,
      sharesOutstanding: 509_000_000,
    });
    expect(r?.derived).toBe(true);
    expect(r?.source).toBe("calculated");
    expect(r?.priceDate).toBe("2026-04-13");
    expect(r?.value).toBeGreaterThan(920_000_000);
    expect(r?.value).toBeLessThan(921_000_000);
  });

  it("null quando P/E e null", () => {
    const r = deriveNetIncome({
      publishedNI: null,
      priceAtReport: 31.65,
      priceDate: "2026-04-13",
      pe: null,
      sharesOutstanding: 509_000_000,
    });
    expect(r).toBeNull();
  });

  it("null quando shares e null", () => {
    const r = deriveNetIncome({
      publishedNI: null,
      priceAtReport: 31.65,
      priceDate: "2026-04-13",
      pe: 17.5,
      sharesOutstanding: null,
    });
    expect(r).toBeNull();
  });

  it("null quando P/E e zero (evita Infinity)", () => {
    const r = deriveNetIncome({
      publishedNI: null,
      priceAtReport: 31.65,
      priceDate: "2026-04-13",
      pe: 0,
      sharesOutstanding: 509_000_000,
    });
    expect(r).toBeNull();
  });

  it("null quando P/E e negativo", () => {
    const r = deriveNetIncome({
      publishedNI: null,
      priceAtReport: 31.65,
      priceDate: "2026-04-13",
      pe: -5,
      sharesOutstanding: 509_000_000,
    });
    expect(r).toBeNull();
  });

  it("null quando priceAtReport e null", () => {
    const r = deriveNetIncome({
      publishedNI: null,
      priceAtReport: null,
      priceDate: null,
      pe: 17.5,
      sharesOutstanding: 509_000_000,
    });
    expect(r).toBeNull();
  });
});
