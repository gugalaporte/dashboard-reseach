import { describe, expect, it } from "vitest";
import {
  normalizeCompanyName,
  pctOf,
  pickBestCompanyName,
  searchToken,
  toReais,
} from "../governanca-remuneracao";

describe("normalizeCompanyName", () => {
  it("iguala LSEG e CVM da Allos", () => {
    expect(normalizeCompanyName("Allos SA")).toBe("ALLOS");
    expect(normalizeCompanyName("ALLOS S.A.")).toBe("ALLOS");
  });

  it("mapeia BCO para BANCO", () => {
    expect(normalizeCompanyName("BCO BTG PACTUAL S.A.")).toBe(
      "BANCO BTG PACTUAL"
    );
    expect(normalizeCompanyName("Banco BTG Pactual SA")).toBe(
      "BANCO BTG PACTUAL"
    );
  });
});

describe("pickBestCompanyName", () => {
  it("escolhe Allos e não um nome parcialmente parecido", () => {
    const picked = pickBestCompanyName("Allos SA", ["ALLOS S.A.", "ALLOS XYZ"]);
    expect(picked).toBe("ALLOS S.A.");
  });

  it("prefere a holding certa do BTG", () => {
    const picked = pickBestCompanyName("Banco BTG Pactual SA", [
      "BTG PACTUAL COMMODITIES SERTRADING S.A.",
      "BCO BTG PACTUAL S.A.",
    ]);
    expect(picked).toBe("BCO BTG PACTUAL S.A.");
  });

  it("prefere Suzano operacional, não a holding", () => {
    const picked = pickBestCompanyName("Suzano SA", [
      "SUZANO HOLDING S.A.",
      "SUZANO S.A.",
    ]);
    expect(picked).toBe("SUZANO S.A.");
  });
});

describe("searchToken", () => {
  it("usa a marca, não o descritor genérico", () => {
    expect(searchToken("Petroleo Brasileiro SA Petrobras")).toBe("PETROBRAS");
    expect(searchToken("Itau Unibanco Holding SA")).toBe("UNIBANCO");
    expect(searchToken("Vitru Educacao SA")).toBe("VITRU");
  });
});

describe("pickBestCompanyName Vitru", () => {
  it("escolhe VITRU EDUCAÇÃO e não outra educadora", () => {
    const picked = pickBestCompanyName("Vitru Educacao SA", [
      "SER EDUCACIONAL S.A.",
      "VITRU EDUCAÇÃO S.A.",
      "CRUZEIRO DO SUL EDUCACIONAL S.A.",
    ]);
    expect(picked).toBe("VITRU EDUCAÇÃO S.A.");
  });
});

describe("toReais / pctOf", () => {
  it("converte milhões para reais", () => {
    expect(toReais(2173)).toBe(2_173_000_000);
    expect(toReais(2_173_000_000)).toBe(2_173_000_000);
  });

  it("calcula % da remuneração sobre EBITDA", () => {
    const p = pctOf(57_606_830.45, 2_173_088_000);
    expect(p).not.toBeNull();
    expect(p!).toBeCloseTo(2.65, 1);
  });
});
