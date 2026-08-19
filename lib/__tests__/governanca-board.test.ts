import { describe, expect, it } from "vitest";
import {
  bioNeedsToggle,
  bioPreview,
  boardHeadline,
  formatElectionDate,
  groupByCouncil,
  mandateLine,
  type BoardMember,
} from "../governanca-board";

function member(partial: Partial<BoardMember>): BoardMember {
  return {
    id: 1,
    ticker: "ALOS3",
    councilType: "Conselho de Administração",
    name: "Ana Silva",
    roleLabel: "Conselheira",
    isIndependent: true,
    electionDate: "2025-04-28",
    mandateInfo: "AGO de 2027",
    bio: "Economista.",
    nominatedBy: null,
    displayOrder: 0,
    ...partial,
  };
}

describe("boardHeadline", () => {
  it("junta conselho e fiscal", () => {
    expect(boardHeadline(10, 9)).toBe(
      "Conselho de Administração composto por 10 membros, apoiado por um Conselho Fiscal instalado de 9 integrantes."
    );
  });

  it("usa singular", () => {
    expect(boardHeadline(1, 1)).toMatch(/1 membro/);
    expect(boardHeadline(1, 1)).toMatch(/1 integrante/);
  });

  it("omite fiscal quando não há", () => {
    expect(boardHeadline(6, 0)).toBe(
      "Conselho de Administração composto por 6 membros."
    );
  });

  it("retorna null sem dados", () => {
    expect(boardHeadline(0, 0)).toBeNull();
  });
});

describe("groupByCouncil", () => {
  it("coloca administração antes do fiscal", () => {
    const groups = groupByCouncil([
      member({ id: 2, councilType: "Conselho Fiscal", displayOrder: 0 }),
      member({ id: 1, councilType: "Conselho de Administração", displayOrder: 1 }),
      member({ id: 3, councilType: "Conselho de Administração", displayOrder: 0 }),
    ]);
    expect(groups.map((g) => g.type)).toEqual([
      "Conselho de Administração",
      "Conselho Fiscal",
    ]);
    expect(groups[0].members.map((m) => m.id)).toEqual([3, 1]);
  });
});

describe("formatElectionDate", () => {
  it("formata ISO e preserva texto livre", () => {
    expect(formatElectionDate("2025-04-28")).toBe("28/04/2025");
    expect(formatElectionDate("Não divulgado")).toBe("Não divulgado");
  });
});

describe("mandateLine", () => {
  it("monta eleição e mandato", () => {
    expect(mandateLine("2025-04-28", "AGO de 2027")).toBe(
      "Eleito em 28/04/2025 · mandato até AGO de 2027"
    );
  });

  it("não duplica 'até' no mandato", () => {
    expect(mandateLine("2025-04-28", "Até AGO de 2027")).toBe(
      "Eleito em 28/04/2025 · mandato Até AGO de 2027"
    );
  });
});

describe("bioPreview", () => {
  it("corta texto longo", () => {
    const long = "x".repeat(400);
    expect(bioNeedsToggle(long)).toBe(true);
    expect(bioPreview(long).endsWith("…")).toBe(true);
    expect(bioNeedsToggle("curta")).toBe(false);
  });
});
