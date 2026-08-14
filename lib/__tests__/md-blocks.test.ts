import { describe, expect, it } from "vitest";
import { parseMdBlocks } from "../md-blocks";

const SAMPLE = `## RELATÓRIO 1 — TRACK RECORD

### 2. Mapa de Carreira e Expertise

| Período | Empresa | Cargo |
|---|---|---|
| 2007–2017 | Constellation | Sócio-gestor |
| 2018 | Aliansce | CEO |

**Forças-chave:**
- Integração pós-fusão [Exame]
- Reciclagem de portfólio

**3 pontos positivos:**
1. Recompras de ações [ADVFN]
2. Novo Mercado
`;

describe("parseMdBlocks", () => {
  it("lê títulos, tabela e listas", () => {
    const blocks = parseMdBlocks(SAMPLE);
    expect(blocks[0]).toEqual({
      type: "heading",
      level: 2,
      text: "RELATÓRIO 1 — TRACK RECORD",
    });
    expect(blocks[1]).toMatchObject({ type: "heading", level: 3 });
    const table = blocks.find((b) => b.type === "table");
    expect(table).toMatchObject({
      type: "table",
      headers: ["Período", "Empresa", "Cargo"],
    });
    if (table?.type === "table") {
      expect(table.rows).toHaveLength(2);
      expect(table.rows[0][1]).toBe("Constellation");
    }
    const ul = blocks.find((b) => b.type === "list" && !b.ordered);
    expect(ul).toMatchObject({ ordered: false });
    if (ul?.type === "list") expect(ul.items[0]).toMatch(/Integração/);
    const ol = blocks.find((b) => b.type === "list" && b.ordered);
    if (ol?.type === "list") expect(ol.items).toHaveLength(2);
  });
});
