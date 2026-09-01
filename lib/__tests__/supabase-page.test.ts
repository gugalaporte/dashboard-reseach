import { describe, expect, it } from "vitest";
import { fetchAllRows, SUPABASE_PAGE } from "../supabase-page";

describe("fetchAllRows", () => {
  it("junta páginas até a última incompleta", async () => {
    const page1 = Array.from({ length: SUPABASE_PAGE }, (_, i) => i);
    const page2 = [1000, 1001];
    const rows = await fetchAllRows<number>(async (from) => {
      if (from === 0) return { data: page1, error: null };
      if (from === SUPABASE_PAGE) return { data: page2, error: null };
      return { data: [], error: null };
    });
    expect(rows).toHaveLength(SUPABASE_PAGE + 2);
    expect(rows.at(-1)).toBe(1001);
  });
});
