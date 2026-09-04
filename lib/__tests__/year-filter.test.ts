import { describe, expect, it } from "vitest";
import { visibleYears } from "../year-filter";

describe("visibleYears", () => {
  const years = ["2026", "2027", "2028"];

  it("mantém os três quando nenhum ano está selecionado", () => {
    expect(visibleYears(years, null)).toEqual(years);
  });

  it("devolve só o ano escolhido", () => {
    expect(visibleYears(years, "2027")).toEqual(["2027"]);
  });

  it("ignora ano que não está na lista", () => {
    expect(visibleYears(years, "2025")).toEqual(years);
  });
});
