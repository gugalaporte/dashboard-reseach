import { describe, expect, it } from "vitest";
import { ceoInitials, parseSynthesis } from "../ceo-analise";

const SAMPLE = `## SÍNTESE

VEREDITO: Steward de longo prazo · Alinhamento misto
CEO: Gustavo Pimenta

Gustavo Pimenta assumiu o cargo de CEO da Vale em 1º de outubro de 2024.

**Pontos fortes**
- Resolução do acordo de Mariana [CNN Brasil, 25/10/2024]
- Remuneração majoritariamente variável

**Riscos**
- Mandato ainda curto
- Queda de 62% no lucro líquido [Seu Dinheiro, 13/02/2026]
`;

describe("parseSynthesis", () => {
  it("separa resumo, pontos fortes e riscos", () => {
    const p = parseSynthesis(SAMPLE);
    expect(p.summary).toContain("Gustavo Pimenta assumiu o cargo");
    expect(p.summary).not.toContain("VEREDITO");
    expect(p.strengths).toHaveLength(2);
    expect(p.strengths[0]).toMatch(/Mariana/);
    expect(p.risks).toHaveLength(2);
    expect(p.risks[1]).toMatch(/lucro líquido/);
  });

  it("lida com texto vazio", () => {
    expect(parseSynthesis(null)).toEqual({
      summary: "",
      strengths: [],
      risks: [],
    });
  });
});

describe("ceoInitials", () => {
  it("pega primeira e última letra", () => {
    expect(ceoInitials("Gustavo Pimenta")).toBe("GP");
    expect(ceoInitials("João Vitor Menin (Global CEO)")).toBe("JM");
  });
});
