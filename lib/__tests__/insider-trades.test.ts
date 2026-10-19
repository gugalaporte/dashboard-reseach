import { describe, expect, it } from "vitest";
import {
  formatMonthLabel,
  groupByCargo,
  tradeTotals,
  totalsByCompany,
  isInsiderTrade,
  keepLatestVersion,
  monthRange,
  portfolioIssuers,
  type InsiderTrade,
} from "../insider-trades";

describe("isInsiderTrade", () => {
  it("aceita compra e venda à vista, a termo e simples", () => {
    expect(isInsiderTrade("Compra à vista")).toBe(true);
    expect(isInsiderTrade("Compra")).toBe(true);
    expect(isInsiderTrade("Compra à termo")).toBe(true);
    expect(isInsiderTrade("Venda")).toBe(true);
    expect(isInsiderTrade("Venda à vista")).toBe(true);
    expect(isInsiderTrade("Venda à termo")).toBe(true);
  });

  it("ignora saldo, posse e doação", () => {
    expect(isInsiderTrade("Saldo Inicial")).toBe(false);
    expect(isInsiderTrade("Posse")).toBe(false);
    expect(isInsiderTrade("Doação (doador)")).toBe(false);
  });
});

describe("keepLatestVersion", () => {
  it("fica com a versão maior de cada companhia e data", () => {
    const rows = keepLatestVersion([
      { cnpj: "1", date: "2026-01-01", versao: 1, id: "a" },
      { cnpj: "1", date: "2026-01-01", versao: 2, id: "b" },
      { cnpj: "2", date: "2026-01-01", versao: 1, id: "c" },
    ]);
    expect(rows.map((r) => r.id)).toEqual(["b", "c"]);
  });
});

describe("mês e cargo", () => {
  it("formata o mês e o intervalo da consulta", () => {
    expect(formatMonthLabel("2026-09")).toBe("setembro 2026");
    expect(monthRange("2026-09")).toEqual({
      start: "2026-09-01",
      end: "2026-10-01",
    });
    expect(monthRange("2026-12")?.end).toBe("2027-01-01");
  });

  it("agrupa por cargo e soma o volume de compra e venda", () => {
    const row = (partial: Partial<InsiderTrade>): InsiderTrade => ({
      id: 1,
      ticker: "PETR4",
      company: "Petrobras",
      date: "2026-09-01",
      versao: 1,
      cargo: "Diretor ou Vinculado",
      movimentacao: "Compra à vista",
      valorMobiliario: "PN",
      quantidade: 10,
      preco: 2,
      volume: 20,
      ...partial,
    });
    const groups = groupByCargo([
      row({ id: 1, volume: 100, movimentacao: "Venda à vista", cargo: "Controlador ou Vinculado" }),
      row({ id: 2, volume: 40 }),
      row({ id: 3, volume: 10, movimentacao: "Venda", cargo: "Diretor ou Vinculado" }),
    ]);
    expect(groups.map((g) => g.cargo)).toEqual([
      "Diretor ou Vinculado",
      "Controlador ou Vinculado",
    ]);
    expect(groups[0]?.buyVolume).toBe(40);
    expect(groups[0]?.sellVolume).toBe(10);
    expect(groups[1]?.sellVolume).toBe(100);
    expect(tradeTotals([
      row({ id: 1, volume: 100, movimentacao: "Venda à vista", cargo: "Controlador ou Vinculado" }),
      row({ id: 2, volume: 40 }),
      row({ id: 3, volume: 10, movimentacao: "Venda", cargo: "Diretor ou Vinculado" }),
    ])).toEqual({ buys: 1, sells: 2, buyVolume: 40, sellVolume: 110, netVolume: -70 });
  });

  it("soma compras e vendas por empresa", () => {
    const row = (partial: Partial<InsiderTrade>): InsiderTrade => ({
      id: 1,
      ticker: "PETR4",
      company: "Petrobras",
      date: "2026-09-01",
      versao: 1,
      cargo: "Diretor ou Vinculado",
      movimentacao: "Compra à vista",
      valorMobiliario: "PN",
      quantidade: 10,
      preco: 2,
      volume: 20,
      ...partial,
    });
    const totals = totalsByCompany([
      row({ id: 1, ticker: "VALE3", volume: 5, movimentacao: "Venda" }),
      row({ id: 2, ticker: "PETR4", volume: 40 }),
      row({ id: 3, ticker: "PETR4", volume: 10, movimentacao: "Venda à vista" }),
    ]);
    expect(totals.map((t) => t.ticker)).toEqual(["PETR4", "VALE3"]);
    expect(totals[0]).toMatchObject({
      buys: 1,
      sells: 1,
      buyVolume: 40,
      sellVolume: 10,
      netVolume: 30,
    });
    expect(totals[1]).toMatchObject({
      buys: 0,
      sells: 1,
      buyVolume: 0,
      sellVolume: 5,
      netVolume: -5,
    });
  });
});

describe("portfolioIssuers", () => {
  it("junta classes da mesma empresa e usa o nome da CVM", () => {
    const rows = portfolioIssuers(["PETR4", "AZUL11", "AZUL3", "XXXX3"]);
    expect(rows).toEqual([
      { ticker: "AZUL3", cvmName: "AZUL S.A." },
      { ticker: "PETR4", cvmName: "PETRÓLEO BRASILEIRO S.A. - PETROBRAS" },
    ]);
  });
});
