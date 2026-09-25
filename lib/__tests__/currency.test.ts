import { describe, expect, it } from "vitest";
import {
  defaultCcyForTicker,
  isoCurrency,
  normalizeCcy,
  sameCcy,
  tpChangePct,
} from "../currency";
import {
  applyRevisionCurrency,
  buildTargetCcyLookup,
} from "../revision-currency";

describe("normalizeCcy", () => {
  it("lê unidade suja do pipeline", () => {
    expect(normalizeCcy("US,")).toBe("US$");
    expect(normalizeCcy("R,")).toBe("R$");
    expect(normalizeCcy("US$")).toBe("US$");
    expect(normalizeCcy("R$")).toBe("R$");
    expect(normalizeCcy("USD")).toBe("US$");
    expect(normalizeCcy("BRL")).toBe("R$");
  });

  it("defaultCcyForTicker: BDR em R$, ADR em US$", () => {
    expect(defaultCcyForTicker("AURA33")).toBe("R$");
    expect(defaultCcyForTicker("AUGO")).toBe("US$");
  });
});

describe("tpChangePct", () => {
  it("não compara R$ com US$", () => {
    expect(tpChangePct(165, 98, "R$", "US$")).toBeNull();
    expect(sameCcy("R$", "US,")).toBe(false);
  });

  it("calcula quando a moeda é a mesma", () => {
    expect(tpChangePct(100, 110, "R$", "R$")).toBeCloseTo(10);
    expect(tpChangePct(165, 98, "US,", "US$")).toBeCloseTo(-40.606, 2);
  });
});

describe("isoCurrency", () => {
  it("US$ vira USD no formatador", () => {
    expect(isoCurrency("US,")).toBe("USD");
    expect(isoCurrency("R$")).toBe("BRL");
  });
});

describe("applyRevisionCurrency", () => {
  const lookup = buildTargetCcyLookup([
    { empresa: "AURA33", pdf_id: 2686, valor: 165, unidade: "R$" },
    { empresa: "AURA33", pdf_id: 3318, valor: 98, unidade: "US," },
  ]);

  it("descarta corte falso R$ 165 → US$ 98", () => {
    const out = applyRevisionCurrency(
      {
        ticker: "AURA33",
        pdf_id: 3318,
        prev_pdf_id: 2686,
        target_price: 98,
        prev_target_price: 165,
        tp_change_pct: -40.6,
        tp_direction: "cut",
        event_type: "tp_change",
      },
      lookup
    );
    expect(out).toBeNull();
  });

  it("vira só mudança de rating quando as moedas não batem", () => {
    const out = applyRevisionCurrency(
      {
        ticker: "AURA33",
        pdf_id: 3318,
        prev_pdf_id: 2686,
        target_price: 98,
        prev_target_price: 165,
        tp_change_pct: -40.6,
        tp_direction: "cut",
        event_type: "rating_and_tp_change",
      },
      lookup
    );
    expect(out?.event_type).toBe("rating_change");
    expect(out?.tp_change_pct).toBeNull();
    expect(out?.target_ccy).toBe("US$");
    expect(out?.prev_target_ccy).toBe("R$");
  });

  it("mantém corte real na mesma moeda", () => {
    const same = buildTargetCcyLookup([
      { empresa: "PETR4", pdf_id: 1, valor: 40, unidade: "R$" },
      { empresa: "PETR4", pdf_id: 2, valor: 36, unidade: "R$" },
    ]);
    const out = applyRevisionCurrency(
      {
        ticker: "PETR4",
        pdf_id: 2,
        prev_pdf_id: 1,
        target_price: 36,
        prev_target_price: 40,
        tp_change_pct: -10,
        tp_direction: "cut",
        event_type: "tp_change",
      },
      same
    );
    expect(out?.tp_change_pct).toBe(-10);
    expect(out?.event_type).toBe("tp_change");
  });
});
