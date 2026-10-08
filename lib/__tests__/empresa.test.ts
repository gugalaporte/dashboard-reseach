import { describe, expect, it } from "vitest";
import {
  empresaHref,
  latestConsensoByFonte,
  parseEmpresaTab,
  pickEmpresaRow,
  siblingTickers,
} from "../empresa";

describe("empresaHref", () => {
  it("normaliza AZUL4 para AZUL3", () => {
    expect(empresaHref("azul4")).toBe("/empresa/AZUL3");
  });
});

describe("pickEmpresaRow", () => {
  it("escolhe o papel com setor no mesmo emissor", () => {
    const picked = pickEmpresaRow(
      [
        { empresa: "AZUL11", name: null, sector: null },
        { empresa: "AZUL3", name: null, sector: "Transportation" },
      ],
      "AZUL15"
    );
    expect(picked?.empresa).toBe("AZUL3");
  });
});

describe("siblingTickers", () => {
  it("lista os papéis do mesmo emissor", () => {
    expect(siblingTickers(["AZUL3", "PETR4", "AZUL11"], "AZUL4")).toEqual([
      "AZUL11",
      "AZUL3",
    ]);
  });
});

describe("parseEmpresaTab", () => {
  it("aceita seções válidas", () => {
    expect(parseEmpresaTab("governanca")).toBe("governanca");
  });

  it("ignora valor inválido", () => {
    expect(parseEmpresaTab("xyz")).toBeNull();
  });
});

describe("latestConsensoByFonte", () => {
  it("fica só com o relatório mais recente de cada casa", () => {
    const out = latestConsensoByFonte(
      [
        {
          empresa: "PETR3",
          fonte: "Safra",
          target: { date: "2025-01-10" },
        },
        {
          empresa: "PETR4",
          fonte: "Safra",
          target: { date: "2026-09-17" },
        },
        {
          empresa: "PETR4",
          fonte: "BTG Pactual",
          target: { date: "2026-08-01" },
        },
      ],
      "PETR4"
    );
    expect(out.map((r) => `${r.fonte}:${r.empresa}`)).toEqual([
      "BTG Pactual:PETR4",
      "Safra:PETR4",
    ]);
  });
});
