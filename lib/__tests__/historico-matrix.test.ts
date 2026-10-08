import { describe, expect, it } from "vitest";
import { buildHistoricoMatrix, isYearPeriodo } from "../historico-matrix";
import type { MetricaRow } from "@/types/research";

function row(
  metrica: string,
  periodo: string,
  valor: number | null,
  data = "2026-01-01"
): MetricaRow {
  return {
    empresa: "PETR4",
    metrica,
    periodo,
    valor,
    unidade: null,
    fonte: "Safra",
    data_relatorio: data,
    pdf_id: 1,
  };
}

describe("isYearPeriodo", () => {
  it("aceita ano e sufixo A/E", () => {
    expect(isYearPeriodo("2025")).toBe(true);
    expect(isYearPeriodo("2025A")).toBe(true);
    expect(isYearPeriodo("2025E")).toBe(true);
  });

  it("rejeita data de relatório", () => {
    expect(isYearPeriodo("2026-08-20")).toBe(false);
    expect(isYearPeriodo("2026-05-04")).toBe(false);
  });
});

describe("buildHistoricoMatrix", () => {
  it("mostra só anos com dado e ignora colunas de data", () => {
    const out = buildHistoricoMatrix([
      row("P/E", "2025", 4),
      row("P/E", "2026", 4.2),
      row("Market Cap", "2026-08-20", 117),
      row("Performance TD", "2026-08-20", 2.7),
    ]);
    expect(out.periodos).toEqual(["2025", "2026"]);
    expect(out.metricas).toEqual(["P/E"]);
  });

  it("fica com o relatório mais recente no mesmo ano", () => {
    const out = buildHistoricoMatrix([
      row("P/E", "2026", 3, "2025-01-01"),
      row("P/E", "2026", 4.2, "2026-09-01"),
    ]);
    expect(out.byMetrica.get("P/E")?.get("2026")?.valor).toBe(4.2);
  });
});
