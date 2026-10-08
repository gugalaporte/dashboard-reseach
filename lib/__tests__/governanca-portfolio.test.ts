import { describe, expect, it } from "vitest";
import { issuerKey, pickPortfolioCompanies } from "../governanca-portfolio";

function card(
  empresa: string,
  partial: { name?: string | null; sector?: string | null } = {}
) {
  return {
    empresa,
    name: partial.name ?? null,
    sector: partial.sector ?? null,
  };
}

describe("issuerKey", () => {
  it("agrupa classes e recibos da mesma empresa", () => {
    expect(issuerKey("AZUL3")).toBe("AZUL");
    expect(issuerKey("AZUL4")).toBe("AZUL");
    expect(issuerKey("AZUL11")).toBe("AZUL");
    expect(issuerKey("BPAC11")).toBe("BPAC");
    expect(issuerKey("AXIA7")).toBe("AXIA");
  });
});

describe("pickPortfolioCompanies", () => {
  it("deixa um card por empresa e prefere o ticker com setor", () => {
    const picked = pickPortfolioCompanies([
      card("AZUL11"),
      card("AZUL3"),
      card("AZUL3", { sector: "Transportation" }),
      card("AXIA7"),
      card("AXIA3", { sector: "Utilities" }),
      card("POMO3"),
      card("POMO4", { sector: "Capital Goods" }),
    ]);
    expect(picked.map((r) => r.empresa)).toEqual(["AXIA3", "AZUL3", "POMO4"]);
    expect(picked.find((r) => r.empresa === "AZUL3")?.sector).toBe("Transportation");
  });
});
