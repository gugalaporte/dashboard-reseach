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

  it("tira 2026 e 2027 quando existem 2026E e 2027E", () => {
    const out = buildHistoricoMatrix(
      [
        row("P/E", "2025", 3.9),
        row("P/E", "2025E", 4),
        row("P/E", "2026A", 3.8),
        row("P/E", "2026", 4.2),
        row("P/E", "2026E", 4.8),
        row("P/E", "2027", 5.5),
        row("P/E", "2027E", 5.2),
        row("P/E", "2028E", 5.3),
      ],
      2026
    );
    expect(out.periodos).toEqual([
      "2025",
      "2025E",
      "2026A",
      "2026E",
      "2027E",
      "2028E",
    ]);
  });

  it("fica com o relatório mais recente no mesmo ano", () => {
    const out = buildHistoricoMatrix([
      row("P/E", "2026", 3, "2025-01-01"),
      row("P/E", "2026", 4.2, "2026-09-01"),
    ]);
    expect(out.byMetrica.get("P/E")?.get("2026")?.valor).toBe(4.2);
  });
});
