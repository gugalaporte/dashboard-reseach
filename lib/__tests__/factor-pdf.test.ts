import { describe, expect, it } from "vitest";
import { factorPdfFilename, factorPdfTable } from "../factor-pdf";
import type { FactorRow } from "../factor-scoring";

function row(partial: Partial<FactorRow> & Pick<FactorRow, "ticker">): FactorRow {
  return {
    ric: `${partial.ticker}.SA`,
    name: partial.ticker,
    sector: "Energy",
    asOfDate: "2026-09-25",
    quality: 0.5,
    value: -0.2,
    momentum: 1.1,
    carry: 0,
    liquidity: null,
    score: 0.4,
    percentile: 80,
    factorClass: "A",
    eligible: true,
    inPortfolio: false,
    breakdown: [],
    raw: {} as FactorRow["raw"],
    ...partial,
  };
}

describe("factorPdfFilename", () => {
  it("usa a data de atualização", () => {
    expect(factorPdfFilename("2026-09-25")).toBe("screening-finacap-2026-09-25.pdf");
  });
});

describe("factorPdfTable", () => {
  it("monta as colunas da tela e marca carteira com *", () => {
    const table = factorPdfTable({
      rows: [
        row({ ticker: "PETR4", inPortfolio: true }),
        row({ ticker: "VALE3", quality: null }),
      ],
      asOfDate: "2026-09-25",
      weights: { quality: 30, value: 30, carry: 30, momentum: 10 },
      sectorLabel: (r) => r.sector ?? "",
      includeReason: false,
    });
    expect(table.head).toEqual([
      "Papel",
      "Setor",
      "Quality",
      "Value",
      "Momentum",
      "Carry",
      "Score",
      "Classe",
    ]);
    expect(table.body[0]![0]).toBe("PETR4 *");
    expect(table.body[1]![2]).toBe("–");
    expect(table.subtitle).toContain("30%");
  });

  it("inclui motivo quando a tela mostra inelegíveis", () => {
    const table = factorPdfTable({
      rows: [
        row({
          ticker: "FOO3",
          eligible: false,
          factorClass: null,
          ineligibleReason: "Volume < 1000000",
        }),
      ],
      asOfDate: "2026-09-25",
      weights: { quality: 30, value: 30, carry: 30, momentum: 10 },
      sectorLabel: () => "Consumo",
      includeReason: true,
    });
    expect(table.head.at(-1)).toBe("Motivo");
    expect(table.body[0]!.at(-1)).toBe("Volume < 1000000");
  });
});

describe("jspdf + autotable", () => {
  it("monta um PDF com a tabela", async () => {
    const [{ jsPDF }, autoTableMod] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF({ orientation: "landscape" });
    autoTableMod.default(doc, { head: [["Papel"]], body: [["PETR4"]] });
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(200);
  });
});
