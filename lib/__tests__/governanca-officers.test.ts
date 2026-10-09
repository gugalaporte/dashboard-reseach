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
      officer({ id: 2, displayOrder: 1, name: "B" }),
      officer({ id: 1, displayOrder: 0, name: "A" }),
    ]);
    expect(out.map((o) => o.id)).toEqual([1, 2]);
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
