import { describe, expect, it } from "vitest";
import {
  blankToNull,
  buildOwnershipSlices,
  formatParentName,
  investorTypePt,
  num,
  ownershipHeadline,
  parentView,
} from "../governanca-ownership";

describe("blankToNull", () => {
  it("trata vazio como null", () => {
    expect(blankToNull("")).toBeNull();
    expect(blankToNull("  ")).toBeNull();
    expect(blankToNull("Axia Energia SA")).toBe("Axia Energia SA");
  });
});

describe("investorTypePt", () => {
  it("traduz tipos LSEG comuns", () => {
    expect(investorTypePt("Government Agency")).toBe("Governo");
    expect(investorTypePt("Sovereign Wealth Fund")).toBe("Fundo soberano");
    expect(investorTypePt("Family Office XYZ")).toBe("Family Office XYZ");
    expect(investorTypePt(null)).toBe("—");
  });
});

describe("num", () => {
  it("lê percentual e ações", () => {
    expect(num(29.9418)).toBeCloseTo(29.9418);
    expect(num("699735529")).toBe(699735529);
    expect(num("")).toBeNull();
  });
});

describe("buildOwnershipSlices", () => {
  it("nomeia os 6 maiores e junta o resto em Outros", () => {
    const holders = [
      { name: "Governo", type: null, parentType: null, shares: null, pct: 30, holdingsDate: null },
      { name: "A", type: null, parentType: null, shares: null, pct: 8, holdingsDate: null },
      { name: "B", type: null, parentType: null, shares: null, pct: 7, holdingsDate: null },
      { name: "C", type: null, parentType: null, shares: null, pct: 6, holdingsDate: null },
      { name: "D", type: null, parentType: null, shares: null, pct: 5, holdingsDate: null },
      { name: "E", type: null, parentType: null, shares: null, pct: 4, holdingsDate: null },
      { name: "F", type: null, parentType: null, shares: null, pct: 3, holdingsDate: null },
      { name: "G", type: null, parentType: null, shares: null, pct: 2, holdingsDate: null },
    ];
    const slices = buildOwnershipSlices(holders);
    const outros = slices.find((s) => s.name === "Outros");
    const total = slices.reduce((s, x) => s + x.pct, 0);
    expect(slices).toHaveLength(7);
    expect(outros?.pct).toBeCloseTo(40);
    expect(total).toBeCloseTo(100);
    expect(slices[0].name).toBe("Outros");
  });
});

describe("formatParentName / parentView", () => {
  it("traduz o governo brasileiro e não duplica", () => {
    expect(
      formatParentName("Brazil, Federative Republic of (Government)")
    ).toBe("União Federal");
    const view = parentView({
      companyName: "Petroleo Brasileiro SA Petrobras",
      immediateParent: "Brazil, Federative Republic of (Government)",
      ultimateParent: "Brazil, Federative Republic of (Government)",
    });
    expect(view).toEqual({ kind: "one", name: "União Federal" });
  });

  it("omite parent que é a própria empresa", () => {
    const view = parentView({
      companyName: "Axia Energia SA",
      immediateParent: "Axia Energia SA",
      ultimateParent: "Axia Energia SA",
    });
    expect(view).toEqual({ kind: "none" });
  });
});

describe("ownershipHeadline", () => {
  it("distingue capital pulverizado de controlador", () => {
    const emptyParents = {
      companyName: "Axia Energia SA",
      immediateParent: "Axia Energia SA",
      ultimateParent: "Axia Energia SA",
    };
    expect(
      ownershipHeadline({
        holders: [
          { name: "A", type: null, parentType: null, shares: null, pct: 29, holdingsDate: null },
        ],
        ...emptyParents,
      })
    ).toMatch(/pulverizado/i);
    expect(
      ownershipHeadline({
        holders: [
          { name: "A", type: null, parentType: null, shares: null, pct: 51, holdingsDate: null },
        ],
        ...emptyParents,
      })
    ).toMatch(/controlador/i);
    expect(
      ownershipHeadline({
        holders: [
          { name: "BNDESPAR", type: null, parentType: null, shares: null, pct: 15, holdingsDate: null },
        ],
        companyName: "Petroleo Brasileiro SA Petrobras",
        immediateParent: "Brazil, Federative Republic of (Government)",
        ultimateParent: "Brazil, Federative Republic of (Government)",
      })
    ).toBe("Controlador: União Federal");
  });
});
