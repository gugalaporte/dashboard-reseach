import { describe, expect, it } from "vitest";
import {
  buildVolumeBars,
  formatBarLabel,
  formatVolume,
  pickVolumeGrain,
  rangeKeys,
  volumeAxis,
  volumePeakKey,
} from "../trade-volume";

describe("pickVolumeGrain", () => {
  it("usa mês em janela de 1 ano", () => {
    expect(pickVolumeGrain("2025-09-15", "2026-09-15")).toBe("month");
  });

  it("usa ano em janela longa", () => {
    expect(pickVolumeGrain("2017-01-01", "2026-07-01")).toBe("year");
  });
});

describe("rangeKeys", () => {
  it("preenche meses contínuos", () => {
    expect(rangeKeys("2026-01-15", "2026-03-02", "month")).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
  });
});

describe("buildVolumeBars", () => {
  it("divide o notional pelos pregões do mês", () => {
    const bars = buildVolumeBars(
      [
        { tradeDateIso: "2026-01-05", notional: 100 },
        { tradeDateIso: "2026-01-05", notional: 50 },
        { tradeDateIso: "2026-01-06", notional: 50 },
      ],
      "month",
      "2026-01-20"
    );
    expect(bars).toHaveLength(1);
    expect(bars[0].sessionCount).toBe(2);
    expect(bars[0].adtv).toBe(100);
    expect(bars[0].totalNotional).toBe(200);
    expect(bars[0].partial).toBe(true);
    expect(bars[0].label).toBe("jan/26");
  });

  it("preenche meses sem execução no intervalo", () => {
    const bars = buildVolumeBars(
      [{ tradeDateIso: "2026-02-10", notional: 50 }],
      "month",
      "2026-03-15",
      { fromIso: "2026-01-01", toIso: "2026-03-15" }
    );
    expect(bars.map((b) => b.key)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(bars[0].totalNotional).toBe(0);
    expect(bars[1].totalNotional).toBe(50);
    expect(bars[2].totalNotional).toBe(0);
  });

  it("agrupa por ano e marca o ano corrente como parcial", () => {
    const bars = buildVolumeBars(
      [
        { tradeDateIso: "2025-11-01", notional: 200 },
        { tradeDateIso: "2026-03-01", notional: 100 },
        { tradeDateIso: "2026-04-01", notional: 100 },
      ],
      "year",
      "2026-07-15"
    );
    expect(bars.map((b) => b.key)).toEqual(["2025", "2026"]);
    expect(bars[0].partial).toBe(false);
    expect(bars[1].partial).toBe(true);
    expect(bars[1].adtv).toBe(100);
  });
});

describe("volumePeakKey", () => {
  it("aponta o mês de maior volume", () => {
    expect(
      volumePeakKey([
        {
          key: "2021",
          label: "2021",
          adtv: 29,
          totalNotional: 29,
          sessionCount: 1,
          partial: false,
        },
        {
          key: "2026",
          label: "2026",
          adtv: 24.65,
          totalNotional: 24.65,
          sessionCount: 1,
          partial: true,
        },
      ])
    ).toBe("2021");
  });
});

describe("volumeAxis", () => {
  it("arredonda 29 bi para teto 40 bi", () => {
    const axis = volumeAxis(29e9);
    expect(axis.divisor).toBe(1e9);
    expect(axis.suffix).toBe("bi");
    expect(axis.max).toBe(40);
    expect(formatVolume(29e9, axis, 0)).toBe("R$ 29 bi");
  });

  it("rotula barra em milhões", () => {
    expect(formatBarLabel(31_259_190)).toBe("31 mi");
  });
});
