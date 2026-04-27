import { describe, it, expect } from "vitest";
import { formatDateShort, parseDisplayDate } from "../format";

describe("parseDisplayDate (date-only ISO sem deslocar dia)", () => {
  it("yyyy-mm-dd vira meia-noite local (dia 14 permanece 14)", () => {
    const d = parseDisplayDate("2026-04-14");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(3);
    expect(d.getDate()).toBe(14);
  });

  it("formatDateShort exibe 14/04/2026 para 2026-04-14", () => {
    expect(formatDateShort("2026-04-14")).toMatch(/14\/04\/2026/);
  });
});
