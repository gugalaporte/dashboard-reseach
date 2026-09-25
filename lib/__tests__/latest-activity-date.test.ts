import { describe, expect, it } from "vitest";
import { latestActivityDate, latestRowsDate } from "../activity-date";

describe("latestActivityDate", () => {
  it("usa a data de byMetricYear quando é mais nova que o preço", () => {
    expect(
      latestActivityDate({
        price: { date: "2026-07-30" },
        rating: { date: "2026-07-30" },
        byMetricYear: {
          pe: { "2027": { date: "2026-08-03" } },
          eps: { "2027": { date: "2026-08-03" } },
        },
      })
    ).toBe("2026-08-03");
  });

  it("fica no preço quando não há métricas mais novas", () => {
    expect(
      latestActivityDate({
        price: { date: "2026-07-30" },
      })
    ).toBe("2026-07-30");
  });
});

describe("latestRowsDate", () => {
  it("pega a data mais nova entre as linhas", () => {
    expect(
      latestRowsDate([
        { price: { date: "2026-09-21" } },
        { price: { date: "2026-09-25" } },
        { target: { date: "2026-09-24" } },
      ])
    ).toBe("2026-09-25");
  });

  it("ignora data futura de extração", () => {
    expect(
      latestRowsDate([
        { price: { date: "2026-09-21" } },
        { price: { date: "2029-06-15" } },
      ])
    ).toBe("2026-09-21");
  });

  it("não conta LSEG no Research", () => {
    expect(
      latestRowsDate(
        [
          { fonte: "Itaú BBA", price: { date: "2026-09-24" } },
          { fonte: "LSEG", price: { date: "2026-09-25" } },
        ],
        { excludeFontes: ["LSEG"] }
      )
    ).toBe("2026-09-24");
  });
});
