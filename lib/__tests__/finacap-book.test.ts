import { describe, expect, it } from "vitest";
import { finacapBook, sectorForFilter } from "../finacap-book";

describe("finacapBook", () => {
  it("agrupa energia em Utilities e bancos em Financials", () => {
    expect(finacapBook("EQTL3")).toBe("Utilities");
    expect(finacapBook("itub4")).toBe("Financials");
    expect(finacapBook("VALE3")).toBe("Commodities");
    expect(finacapBook("ALOS3")).toBe("Consumo");
  });

  it("aceita ticker sujo e AZUL em caixa mista", () => {
    expect(finacapBook(" azul4 ")).toBe("Consumo");
    expect(finacapBook("EMBj3")).toBe("Consumo");
  });

  it("devolve null se não estiver no book", () => {
    expect(finacapBook("XXXX3")).toBeNull();
  });
});

describe("sectorForFilter", () => {
  it("usa o book Finacap ou o setor LSEG", () => {
    expect(sectorForFilter("PETR4", "Energy", "finacap")).toBe("Commodities");
    expect(sectorForFilter("PETR4", "Energy", "lseg")).toBe("Energy");
  });
});
