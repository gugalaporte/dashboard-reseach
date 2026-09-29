/** Book Finacap: agrupamento interno de setores (não é o GICS/LSEG). */

import { bovespaSubsector } from "./bovespa-subsector";

export const FINACAP_BOOKS = [
  "Commodities",
  "Consumo",
  "Financials",
  "Utilities",
  "Tesouraria",
] as const;

export type FinacapBook = (typeof FINACAP_BOOKS)[number];

const BOOK_BY_TICKER: Record<string, FinacapBook> = {
  AESB3: "Utilities",
  ALOS3: "Consumo",
  AZUL3: "Consumo",
  AZUL4: "Consumo",
  BRBI11: "Financials",
  CMIG4: "Utilities",
  DXCO3: "Commodities",
  AXIA3: "Utilities",
  AXIA6: "Utilities",
  ENGI11: "Utilities",
  EQTL3: "Utilities",
  GOAU3: "Commodities",
  GOAU4: "Commodities",
  INBR32: "Financials",
  ITSA3: "Financials",
  ITUB3: "Financials",
  ITUB4: "Financials",
  LOGG3: "Consumo",
  LREN3: "Consumo",
  MRVE3: "Consumo",
  PETR3: "Commodities",
  PETR4: "Commodities",
  POMO3: "Consumo",
  POMO4: "Consumo",
  PORT3: "Consumo",
  POSI3: "Consumo",
  PSSA3: "Financials",
  RAPT3: "Consumo",
  RAPT4: "Consumo",
  RDOR3: "Consumo",
  SLCE3: "Commodities",
  STBP3: "Consumo",
  SUZB3: "Commodities",
  ISAE4: "Utilities",
  TIMS3: "Utilities",
  VALE3: "Commodities",
  VBBR3: "Commodities",
  VIVT3: "Utilities",
  YDUQ3: "Consumo",
  AZULL560: "Consumo",
  AZUL2: "Consumo",
  AZUL13: "Consumo",
  AZUL95: "Consumo",
  AZUL11: "Consumo",
  AZUL12: "Consumo",
  CSAN3: "Commodities",
  BRAV3: "Commodities",
  FLRY3: "Consumo",
  AZZA3: "Consumo",
  RECV3: "Commodities",
  IRBR3: "Financials",
  MGLU3: "Consumo",
  VIVA3: "Consumo",
  RAIZ4: "Commodities",
  PCAR3: "Consumo",
  PETZ3: "Consumo",
  CVCB3: "Consumo",
  BBAS3: "Financials",
  ABEV3: "Consumo",
  BPAC11: "Financials",
  PRIO3: "Commodities",
  BBSE3: "Financials",
  TOTS3: "Consumo",
  BBDC3: "Financials",
  RADL3: "Consumo",
  UGPA3: "Commodities",
  ASAI3: "Consumo",
  KLBN11: "Commodities",
  HAPV3: "Consumo",
  SANB11: "Financials",
  HYPE3: "Consumo",
  NATU3: "Consumo",
  CXSE3: "Financials",
  SMFT3: "Consumo",
  BBDC4: "Financials",
  SBSP3: "Utilities",
  B3SA3: "Financials",
  ITSA4: "Financials",
  WEGE3: "Consumo",
  EMBJ3: "Consumo",
  RENT3: "Consumo",
  ENEV3: "Utilities",
  RAIL3: "Consumo",
  GGBR4: "Commodities",
  CPLE6: "Utilities",
  CPLE5: "Utilities",
  BRFS3: "Commodities",
  MOTV3: "Consumo",
  EGIE3: "Utilities",
  MULT3: "Consumo",
  CMIN3: "Commodities",
  CPFE3: "Utilities",
  TAEE11: "Utilities",
  CYRE3: "Consumo",
  MRFG3: "Commodities",
  CSNA3: "Commodities",
  COGN3: "Consumo",
  IGTI11: "Consumo",
  DIRR3: "Consumo",
  BRAP4: "Commodities",
  AURE3: "Utilities",
  BRKM5: "Commodities",
  SMTO3: "Commodities",
  BEEF3: "Commodities",
  USIM5: "Commodities",
  VAMO3: "Consumo",
  CEAB3: "Consumo",
  MBRF3: "Commodities",
  CURY3: "Consumo",
  AZUL54: "Consumo",
  AZUL80: "Consumo",
  AXIA7: "Utilities",
  RENT4: "Consumo",
  CPLE3: "Utilities",
  CSMG3: "Utilities",
};

/** Azul: screening e carteira usam AZUL3; LSEG ainda entrega AZUL4. */
const DISPLAY_TICKER: Record<string, string> = {
  AZUL4: "AZUL3",
};

export function displayTicker(ticker: string | null | undefined): string {
  const t = (ticker ?? "").trim().toUpperCase();
  return DISPLAY_TICKER[t] ?? t;
}

export function finacapBook(ticker: string | null | undefined): FinacapBook | null {
  const t = displayTicker(ticker);
  if (!t) return null;
  return BOOK_BY_TICKER[t] ?? BOOK_BY_TICKER[(ticker ?? "").trim().toUpperCase()] ?? null;
}

export type SectorSource = "lseg" | "finacap" | "bovespa";

export function sectorForFilter(
  ticker: string,
  lsegSector: string | null | undefined,
  source: SectorSource
): string | null {
  if (source === "finacap") return finacapBook(ticker);
  if (source === "bovespa") return bovespaSubsector(ticker);
  const s = (lsegSector ?? "").trim();
  return s || null;
}
