import { describe, expect, it } from "vitest";
import {
  countByPipeline,
  defaultPipelineStage,
  emptyPipelineCounts,
  finacapUpside,
  inPipelineStage,
  parsePipelineStage,
  sortPipelineByDate,
} from "../pipeline";

describe("countByPipeline", () => {
  it("acumula etapas mais avançadas nas anteriores", () => {
    const counts = countByPipeline([
      { status: "watchlist" },
      { status: "watchlist" },
      { status: "position" },
    ]);
    expect(counts.watchlist).toBe(3);
    expect(counts.thesis_ready).toBe(1);
    expect(counts.position).toBe(1);
  });

  it("ignora empresa sem etapa", () => {
    const counts = countByPipeline([{ status: null }, { status: "position" }]);
    expect(counts.position).toBe(1);
    expect(counts.thesis_ready).toBe(1);
    expect(counts.watchlist).toBe(1);
  });
});

describe("inPipelineStage", () => {
  it("posição aparece em tese pronta e watchlist", () => {
    expect(inPipelineStage("position", "position")).toBe(true);
    expect(inPipelineStage("position", "thesis_ready")).toBe(true);
    expect(inPipelineStage("position", "watchlist")).toBe(true);
  });

  it("tese pronta aparece em watchlist, não em posição", () => {
    expect(inPipelineStage("thesis_ready", "watchlist")).toBe(true);
    expect(inPipelineStage("thesis_ready", "thesis_ready")).toBe(true);
    expect(inPipelineStage("thesis_ready", "position")).toBe(false);
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

describe("sortPipelineByDate", () => {
  it("ordena da data mais recente para a mais antiga", () => {
    const ordered = sortPipelineByDate([
      { ticker: "VALE3", updatedAt: "2026-01-01T00:00:00.000Z" },
      { ticker: "PETR4", updatedAt: "2026-09-30T12:00:00.000Z" },
      { ticker: "ITUB4", updatedAt: "2026-06-15T08:00:00.000Z" },
    ]);
    expect(ordered.map((n) => n.ticker)).toEqual(["PETR4", "ITUB4", "VALE3"]);
  });

  it("coloca empresa sem data no fim", () => {
    const ordered = sortPipelineByDate([
      { ticker: "BBAS3", updatedAt: null },
      { ticker: "WEGE3", updatedAt: "2026-03-01T00:00:00.000Z" },
    ]);
    expect(ordered.map((n) => n.ticker)).toEqual(["WEGE3", "BBAS3"]);
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
