import { describe, expect, it } from "vitest";
import {
  countByPipeline,
  defaultPipelineStage,
  emptyPipelineCounts,
  finacapUpside,
  parsePipelineStage,
} from "../pipeline";

describe("countByPipeline", () => {
  it("conta por etapa", () => {
    const counts = countByPipeline([
      { status: "watchlist" },
      { status: "watchlist" },
      { status: "position" },
    ]);
    expect(counts.watchlist).toBe(2);
    expect(counts.thesis_ready).toBe(0);
    expect(counts.position).toBe(1);
  });

  it("ignora empresa sem etapa", () => {
    const counts = countByPipeline([{ status: null }, { status: "position" }]);
    expect(counts.position).toBe(1);
    expect(counts.watchlist).toBe(0);
  });
});

describe("defaultPipelineStage", () => {
  it("escolhe a primeira etapa com empresas", () => {
    const counts = emptyPipelineCounts();
    counts.thesis_ready = 1;
    expect(defaultPipelineStage(counts)).toBe("thesis_ready");
  });

  it("cai em watchlist se estiver vazio", () => {
    expect(defaultPipelineStage(emptyPipelineCounts())).toBe("watchlist");
  });
});

describe("parsePipelineStage", () => {
  it("aceita etapa válida", () => {
    expect(parsePipelineStage("thesis_ready")).toBe("thesis_ready");
  });
});

describe("finacapUpside", () => {
  it("calcula (TP − fechamento) / fechamento", () => {
    expect(finacapUpside(32, 70)).toBeCloseTo(118.75, 5);
  });

  it("fica vazio sem um dos preços", () => {
    expect(finacapUpside(null, 70)).toBe(null);
    expect(finacapUpside(32, null)).toBe(null);
    expect(finacapUpside(0, 70)).toBe(null);
  });
});
