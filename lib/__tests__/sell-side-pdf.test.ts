import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  isPreferredFolder,
  pdfBaseName,
  reportsCandidates,
  samePdfName,
  SELL_SIDE_RELATIVE,
} from "../sell-side-pdf";

describe("pdfBaseName", () => {
  it("usa file_name quando existe", () => {
    expect(
      pdfBaseName("VALE_20260918.pdf", "Trânsito - Banco de Dados/outro.pdf")
    ).toBe("VALE_20260918.pdf");
  });

  it("cai no basename de file_path", () => {
    expect(pdfBaseName(null, "Trânsito - Banco de Dados/CEAB_20260827.pdf")).toBe(
      "CEAB_20260827.pdf"
    );
  });

  it("usa só o nome, mesmo se vier com pasta", () => {
    expect(pdfBaseName("../secret.pdf", null)).toBe("secret.pdf");
    expect(pdfBaseName("..", null)).toBeNull();
  });
});

describe("samePdfName", () => {
  it("ignora caixa e acento", () => {
    expect(samePdfName("Itaú Final.PDF", "itau final.pdf")).toBe(true);
  });
});

describe("isPreferredFolder", () => {
  it("casa Itaú com pasta itaú/itau", () => {
    expect(isPreferredFolder("itaú", "Itaú BBA")).toBe(true);
    expect(isPreferredFolder("itau", "Itaú BBA")).toBe(true);
    expect(isPreferredFolder("bradesco", "Itaú BBA")).toBe(false);
  });
});

describe("reportsCandidates", () => {
  it("mantém o sufixo compartilhado a partir de FINACAP...", () => {
    const home = "C:\\Users\\Ana";
    const first = reportsCandidates(home)[0]!;
    expect(first).toBe(path.join(home, SELL_SIDE_RELATIVE));
    expect(first).toContain("FINACAP CONSULT FINANC MERC CAP LTDA");
    expect(first).toContain("Sell Side_Reports");
  });

  it("acha a pasta FINACAP dentro do home", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sell-side-"));
    const target = path.join(tmp, SELL_SIDE_RELATIVE);
    fs.mkdirSync(target, { recursive: true });
    try {
      expect(reportsCandidates(tmp)).toContain(target);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
