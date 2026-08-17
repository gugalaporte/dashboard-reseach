import { describe, expect, it } from "vitest";
import { irSiteForTicker } from "../ir-sites";

describe("irSiteForTicker", () => {
  it("devolve o RI da TIM e da Petrobras", () => {
    expect(irSiteForTicker("TIMS3")).toBe("https://ri.tim.com.br/");
    expect(irSiteForTicker("petr4")).toContain("investidorpetrobras");
  });

  it("retorna null se não houver cadastro", () => {
    expect(irSiteForTicker("XXXX3")).toBeNull();
  });
});
