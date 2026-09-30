import { describe, expect, it } from "vitest";
import {
  mondayIso,
  relatedTickers,
  sortWeekEvents,
  type GovernancaEvento,
} from "../governanca-eventos";

function ev(partial: Partial<GovernancaEvento>): GovernancaEvento {
  return {
    id: 1,
    ticker: "TIMS3",
    companyName: "TIM",
    semanaRef: "2026-09-28",
    janelaInicio: "2026-09-28",
    janelaFim: "2026-09-30",
    dataEvento: "2026-09-29T12:00:00+00:00",
    tipo: "FR",
    categoria: "capital",
    titulo: "Evento",
    resumo: null,
    relevancia: "Baixa",
    destaque: false,
    destaqueOrdem: null,
    fonteNome: null,
    fonteUrl: null,
    ...partial,
  };
}

describe("mondayIso", () => {
  it("volta à segunda em Brasília", () => {
    expect(mondayIso(new Date("2026-09-30T18:00:00-03:00"))).toBe("2026-09-28");
    expect(mondayIso(new Date("2026-09-28T08:00:00-03:00"))).toBe("2026-09-28");
  });
});

describe("relatedTickers", () => {
  it("inclui AZUL4 quando o papel é AZUL3", () => {
    expect(relatedTickers("AZUL3").sort()).toEqual(["AZUL3", "AZUL4"]);
  });
});

describe("sortWeekEvents", () => {
  it("coloca destaques na frente, na ordem informada", () => {
    const list = sortWeekEvents([
      ev({ id: 3, destaque: false, titulo: "comum" }),
      ev({ id: 1, destaque: true, destaqueOrdem: 2, titulo: "segundo" }),
      ev({ id: 2, destaque: true, destaqueOrdem: 1, titulo: "primeiro" }),
    ]);
    expect(list.map((e) => e.titulo)).toEqual(["primeiro", "segundo", "comum"]);
  });
});
