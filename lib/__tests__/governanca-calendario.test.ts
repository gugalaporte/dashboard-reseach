import { describe, expect, it } from "vitest";
import {
  eventsInMonth,
  firstEventIsoInMonth,
  groupEventsByDate,
  initialMonth,
  monthGrid,
  monthTitle,
  shiftMonth,
  toIsoDate,
  type ResultadoEvent,
} from "../governanca-calendario";

function ev(partial: Partial<ResultadoEvent>): ResultadoEvent {
  return {
    id: 1,
    ticker: "VALE3",
    name: "VALE",
    date: "2026-08-04",
    ...partial,
  };
}

describe("toIsoDate", () => {
  it("corta timestamptz e ignora vazio", () => {
    expect(toIsoDate("2026-08-04T00:00:00+00:00")).toBe("2026-08-04");
    expect(toIsoDate("2026-08-04")).toBe("2026-08-04");
    expect(toIsoDate("  ")).toBeNull();
  });
});

describe("monthGrid", () => {
  it("agosto/2026 começa na segunda 27/07", () => {
    const cells = monthGrid(2026, 7);
    expect(cells).toHaveLength(42);
    expect(cells[0]).toEqual({ iso: "2026-07-27", day: 27, inMonth: false });
    expect(cells[5]).toEqual({ iso: "2026-08-01", day: 1, inMonth: true });
  });
});

describe("shiftMonth", () => {
  it("vira o ano", () => {
    expect(shiftMonth(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(shiftMonth(2026, 0, -1)).toEqual({ year: 2025, month: 11 });
  });
});

describe("initialMonth", () => {
  it("escolhe o próximo resultado", () => {
    const events = [
      ev({ id: 1, date: "2026-07-27" }),
      ev({ id: 2, date: "2026-08-04" }),
    ];
    expect(initialMonth(events, "2026-08-01")).toEqual({ year: 2026, month: 7 });
  });
});

describe("groupEventsByDate / eventsInMonth", () => {
  it("agrupa no mesmo dia", () => {
    const events = [
      ev({ id: 1, ticker: "ITUB4", date: "2026-08-04" }),
      ev({ id: 2, ticker: "GOAU4", date: "2026-08-04" }),
      ev({ id: 3, ticker: "VALE3", date: "2026-07-30" }),
    ];
    expect(groupEventsByDate(events).get("2026-08-04")).toHaveLength(2);
    expect(eventsInMonth(events, 2026, 7).map((e) => e.ticker)).toEqual([
      "ITUB4",
      "GOAU4",
    ]);
  });
});

describe("monthTitle", () => {
  it("capitaliza o mês em pt-BR", () => {
    expect(monthTitle(2026, 7).toLowerCase()).toContain("agosto");
    expect(monthTitle(2026, 7)).toMatch(/2026/);
  });
});

describe("firstEventIsoInMonth", () => {
  it("prefere hoje, depois o próximo no mês", () => {
    const events = [
      ev({ id: 1, date: "2026-08-04" }),
      ev({ id: 2, date: "2026-08-25" }),
    ];
    expect(firstEventIsoInMonth(events, 2026, 7, "2026-08-25")).toBe(
      "2026-08-25"
    );
    expect(firstEventIsoInMonth(events, 2026, 7, "2026-08-10")).toBe(
      "2026-08-25"
    );
    expect(firstEventIsoInMonth(events, 2026, 7, "2026-08-28")).toBe(
      "2026-08-04"
    );
    expect(firstEventIsoInMonth(events, 2026, 6, "2026-07-01")).toBeNull();
  });
});
