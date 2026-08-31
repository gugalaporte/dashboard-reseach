import { describe, expect, it } from "vitest";
import { chunkList } from "../chunk";

describe("chunkList", () => {
  it("parte em fatias iguais", () => {
    expect(chunkList([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("cabe em um lote só", () => {
    expect(chunkList(["a", "b"], 40)).toEqual([["a", "b"]]);
  });
});
