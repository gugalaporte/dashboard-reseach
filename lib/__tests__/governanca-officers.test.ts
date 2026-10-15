import { describe, expect, it } from "vitest";
import {
  countOnBoard,
  officerHeadline,
  officerRoleLine,
  sortOfficers,
  statutoryOfficers,
  type Officer,
} from "../governanca-officers";

function officer(partial: Partial<Officer>): Officer {
  return {
    id: 1,
    ticker: "ALOS3",
    name: "Rafael Sales",
    roleLabel: "Diretor Presidente",
    isStatutory: true,
    isBoardMember: false,
    electionDate: "2026-03-09",
    mandateInfo: "Não divulgado",
    startDateRole: "Desde 2019",
    bio: "Advogado.",
    sourceUrl: null,
    displayOrder: 0,
    ...partial,
  };
}

describe("officerHeadline", () => {
  it("conta diretores", () => {
    expect(officerHeadline(6, 0)).toBe(
      "Diretoria estatutária composta por 6 diretores."
    );
  });

  it("menciona quem também está no conselho", () => {
    expect(officerHeadline(6, 2)).toBe(
      "Diretoria estatutária composta por 6 diretores, dos quais 2 também integram o conselho."
    );
  });

  it("usa singular", () => {
    expect(officerHeadline(1, 1)).toMatch(/1 diretor/);
    expect(officerHeadline(1, 1)).toMatch(/1 também integra/);
  });

  it("retorna null sem dados", () => {
    expect(officerHeadline(0, 0)).toBeNull();
  });
});

describe("statutoryOfficers", () => {
  it("exclui quem não é estatutário", () => {
    const list = statutoryOfficers([
      officer({ id: 1, isStatutory: true }),
      officer({ id: 2, isStatutory: false, name: "Fora" }),
    ]);
    expect(list.map((o) => o.id)).toEqual([1]);
  });
});

describe("officerRoleLine", () => {
  it("junta cargo e flags", () => {
    expect(
      officerRoleLine(
        officer({ isStatutory: true, isBoardMember: true })
      )
    ).toBe("Diretor Presidente · Estatutário · Membro do conselho");
  });
});

describe("sortOfficers", () => {
  it("ordena por display_order", () => {
    const out = sortOfficers([
      officer({ id: 2, displayOrder: 1, name: "B", roleLabel: "Diretor" }),
      officer({ id: 1, displayOrder: 0, name: "A", roleLabel: "Diretor" }),
    ]);
    expect(out.map((o) => o.id)).toEqual([1, 2]);
  });

  it("coloca CEO e CFO no início, nessa ordem", () => {
    const out = sortOfficers([
      officer({
        id: 1,
        displayOrder: 0,
        name: "Elio",
        roleLabel: "Vice-Presidente Executivo",
      }),
      officer({
        id: 2,
        displayOrder: 1,
        name: "Ivan",
        roleLabel: "Presidente",
      }),
      officer({
        id: 3,
        displayOrder: 2,
        name: "Eduardo",
        roleLabel:
          "Vice-Presidente Executivo Financeiro e de Relações com Investidores",
      }),
      officer({
        id: 4,
        displayOrder: 3,
        name: "Antônio",
        roleLabel: "Vice-Presidente Executivo de Operações",
      }),
    ]);
    expect(out.map((o) => o.name)).toEqual([
      "Ivan",
      "Eduardo",
      "Elio",
      "Antônio",
    ]);
  });

  it("não trata CEO de área nem negócios financeiros como liderança", () => {
    const out = sortOfficers([
      officer({
        id: 1,
        displayOrder: 0,
        name: "Area",
        roleLabel: "Vice-Presidente Executivo e CEO de Lubrificantes",
      }),
      officer({
        id: 2,
        displayOrder: 1,
        name: "Negocios",
        roleLabel: "Diretor Vice-Presidente – Negócios Financeiros",
      }),
      officer({
        id: 3,
        displayOrder: 2,
        name: "Chefe",
        roleLabel: "Diretor Presidente (CEO)",
      }),
      officer({
        id: 4,
        displayOrder: 3,
        name: "Financas",
        roleLabel: "Diretor de Finanças e de Relações com Investidores (CFO)",
      }),
    ]);
    expect(out.map((o) => o.name)).toEqual([
      "Chefe",
      "Financas",
      "Area",
      "Negocios",
    ]);
  });
});

describe("countOnBoard", () => {
  it("conta quem também é conselheiro", () => {
    expect(
      countOnBoard([
        officer({ isBoardMember: true }),
        officer({ id: 2, isBoardMember: false }),
      ])
    ).toBe(1);
  });
});
