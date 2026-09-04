import { describe, expect, it } from "vitest";
import {
  emptyNotes,
  mergeNotes,
  notesHaveContent,
  parseNotesRating,
  parsePipelineStatus,
  parseTargetPrice,
  rowToNotes,
  shouldSeedFromLocal,
} from "../bottom-up-notes";

describe("parsePipelineStatus", () => {
  it("aceita status conhecido", () => {
    expect(parsePipelineStatus("position")).toBe("position");
  });

  it("fica vazio se inválido", () => {
    expect(parsePipelineStatus("xyz")).toBe(null);
    expect(parsePipelineStatus(null)).toBe(null);
  });
});

describe("parseNotesRating", () => {
  it("aceita buy/sell/neutral", () => {
    expect(parseNotesRating("buy")).toBe("buy");
    expect(parseNotesRating("Sell")).toBe(null);
  });
});

describe("parseTargetPrice", () => {
  it("lê número e vírgula", () => {
    expect(parseTargetPrice(12.5)).toBe(12.5);
    expect(parseTargetPrice("12,50")).toBe(12.5);
    expect(parseTargetPrice("")).toBe(null);
    expect(parseTargetPrice("abc")).toBe(null);
  });
});

describe("emptyNotes", () => {
  it("não coloca a empresa em watchlist sozinha", () => {
    expect(emptyNotes("POSI3").status).toBe(null);
  });
});

describe("rowToNotes", () => {
  it("normaliza ticker, risco e rating", () => {
    const n = rowToNotes({
      ticker: "pomo4",
      status: "analyzing",
      rating: "buy",
      target_price: "18.2",
      thesis: null,
      risk: "ciclo",
      governance: null,
      updated_at: "2026-09-04T12:00:00.000Z",
    });
    expect(n.ticker).toBe("POMO4");
    expect(n.status).toBe("analyzing");
    expect(n.rating).toBe("buy");
    expect(n.targetPrice).toBe(18.2);
    expect(n.thesis).toBe("");
    expect(n.risk).toBe("ciclo");
    expect(n.updatedAt).toBe("2026-09-04T12:00:00.000Z");
  });
});

describe("mergeNotes", () => {
  it("preserva campos que o patch não manda", () => {
    const base = {
      ...emptyNotes("POMO4"),
      thesis: "drivers",
      risk: "alavancagem",
      rating: "buy" as const,
    };
    const next = mergeNotes(base, { status: "position" });
    expect(next.thesis).toBe("drivers");
    expect(next.risk).toBe("alavancagem");
    expect(next.rating).toBe("buy");
    expect(next.status).toBe("position");
    expect(next.updatedAt).toBeTruthy();
  });
});

describe("notesHaveContent", () => {
  it("detecta rascunho local", () => {
    expect(notesHaveContent(emptyNotes("POMO4"))).toBe(false);
    expect(
      notesHaveContent({ ...emptyNotes("POMO4"), thesis: "  tese  " })
    ).toBe(true);
    expect(
      notesHaveContent({ ...emptyNotes("POMO4"), rating: "sell" })
    ).toBe(true);
  });
});

describe("shouldSeedFromLocal", () => {
  it("não sobrescreve nota já salva no banco", () => {
    const remote = { ...emptyNotes("POMO4"), updatedAt: "2026-09-01T00:00:00Z" };
    const local = { ...emptyNotes("POMO4"), thesis: "antigo" };
    expect(shouldSeedFromLocal(remote, local)).toBe(false);
  });

  it("copia rascunho local quando o banco está vazio", () => {
    const remote = emptyNotes("POMO4");
    const local = { ...emptyNotes("POMO4"), thesis: "drivers de upside" };
    expect(shouldSeedFromLocal(remote, local)).toBe(true);
  });
});
