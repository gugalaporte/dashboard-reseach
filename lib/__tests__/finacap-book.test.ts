import { describe, expect, it } from "vitest";
import { displayTicker, finacapBook, sectorForFilter } from "../finacap-book";

describe("finacapBook", () => {
  it("agrupa energia em Utilities e bancos em Financials", () => {
    expect(finacapBook("EQTL3")).toBe("Utilities");
    expect(finacapBook("itub4")).toBe("Financials");
    expect(finacapBook("VALE3")).toBe("Commodities");
    expect(finacapBook("ALOS3")).toBe("Consumo");
  });

  it("aceita ticker sujo e trata AZUL4 como AZUL3", () => {
    expect(finacapBook(" azul4 ")).toBe("Consumo");
    expect(finacapBook("AZUL3")).toBe("Consumo");
    expect(finacapBook("EMBj3")).toBe("Consumo");
  });

  it("devolve null se não estiver no book", () => {
    expect(finacapBook("XXXX3")).toBeNull();
  });

  it("mostra AZUL3 no lugar de AZUL4", () => {
    expect(displayTicker("AZUL4")).toBe("AZUL3");
    expect(displayTicker("azul4")).toBe("AZUL3");
    expect(displayTicker("PETR4")).toBe("PETR4");
  });
});

describe("sectorForFilter", () => {
  it("usa o book Finacap, o subsetor Bovespa ou o setor LSEG", () => {
    expect(sectorForFilter("PETR4", "Energy", "finacap")).toBe("Commodities");
    expect(sectorForFilter("PETR4", "Energy", "lseg")).toBe("Energy");
    expect(sectorForFilter("PETR4", "Energy", "bovespa")).toBe("Petróleo e Gás");
    expect(sectorForFilter("AZUL3", "Transportation", "bovespa")).toBe("Transporte");
    expect(sectorForFilter("CVCB3", "Consumer", "bovespa")).toBe("Serviços");
  });
});
