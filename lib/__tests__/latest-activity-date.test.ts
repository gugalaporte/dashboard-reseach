import { describe, expect, it } from "vitest";
import { latestActivityDate } from "../activity-date";

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
