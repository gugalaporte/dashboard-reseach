/** Subsetores Bovespa (filtro do screening). Tesouraria da tabela fica de fora. */

export const BOVESPA_SUBSECTORS = [
  "Agronegócio",
  "Alimentos processados",
  "Água e saneamento",
  "Bancos",
  "Construção civil",
  "Diversos",
  "Educação",
  "Energia elétrica",
  "Exploração de imóveis",
  "Máquinas e equipamentos",
  "Material de transporte",
  "Mineração",
  "Papel e Celulose",
  "Petróleo e Gás",
  "Químicos",
  "Saúde",
  "Seguradoras",
  "Serviços",
  "Serviços financeiros",
  "Siderurgia e metalurgia",
  "Tecnologia",
  "Telecomunicações",
  "Transporte",
  "Varejo e Consumo",
] as const;

export type BovespaSubsector = (typeof BOVESPA_SUBSECTORS)[number];

const TICKERS_BY_SUBSECTOR: Record<BovespaSubsector, readonly string[]> = {
  Agronegócio: ["SLCE3"],
  "Alimentos processados": ["BRFS3", "MRFG3", "SMTO3", "BEEF3", "MBRF3"],
  "Água e saneamento": ["SBSP3", "CSMG3"],
  Bancos: [
    "BRBI11", "INBR32", "ITSA3", "ITUB3", "ITUB4", "BBAS3", "BPAC11",
    "BBDC3", "SANB11", "BBDC4", "ITSA4",
  ],
  "Construção civil": ["MRVE3", "CYRE3", "DIRR3", "CURY3"],
  Diversos: ["RENT3", "COGN3", "VAMO3", "RENT4"],
  Educação: ["YDUQ3"],
  "Energia elétrica": [
    "AESB3", "CMIG4", "AXIA3", "AXIA6", "ENGI11", "EQTL3", "ISAE4", "ENEV3",
    "CPLE6", "CPLE5", "EGIE3", "CPFE3", "TAEE11", "AURE3", "AXIA7", "CPLE3",
  ],
  "Exploração de imóveis": ["ALOS3", "LOGG3", "MULT3", "IGTI11"],
  "Máquinas e equipamentos": ["WEGE3"],
  "Material de transporte": ["POMO3", "POMO4", "RAPT3", "RAPT4", "EMBJ3"],
  Mineração: ["VALE3", "CMIN3", "BRAP4"],
  "Papel e Celulose": ["DXCO3", "SUZB3", "KLBN11"],
  "Petróleo e Gás": [
    "PETR3", "PETR4", "VBBR3", "CSAN3", "BRAV3", "RECV3", "RAIZ4", "PRIO3", "UGPA3",
  ],
  Químicos: ["BRKM5"],
  Saúde: ["RDOR3", "FLRY3", "HAPV3"],
  Seguradoras: ["PSSA3", "IRBR3", "BBSE3", "CXSE3"],
  Serviços: ["CVCB3", "SMFT3"],
  "Serviços financeiros": ["B3SA3"],
  "Siderurgia e metalurgia": ["GOAU3", "GOAU4", "GGBR4", "CSNA3", "USIM5"],
  Tecnologia: ["POSI3", "TOTS3"],
  Telecomunicações: ["TIMS3", "VIVT3"],
  Transporte: [
    "AZUL3", "AZUL4", "PORT3", "STBP3", "AZULL560", "AZUL2", "AZUL13",
    "AZUL95", "AZUL11", "AZUL12", "RAIL3", "MOTV3", "AZUL54", "AZUL80",
  ],
  "Varejo e Consumo": [
    "LREN3", "AZZA3", "MGLU3", "VIVA3", "PCAR3", "PETZ3", "ABEV3",
    "RADL3", "ASAI3", "HYPE3", "NATU3", "CEAB3",
  ],
};

const SUBSECTOR_BY_TICKER: Record<string, BovespaSubsector> = {};
for (const [sector, tickers] of Object.entries(TICKERS_BY_SUBSECTOR) as Array<
  [BovespaSubsector, readonly string[]]
>) {
  for (const ticker of tickers) SUBSECTOR_BY_TICKER[ticker] = sector;
}

export function bovespaSubsector(ticker: string | null | undefined): BovespaSubsector | null {
  const t = (ticker ?? "").trim().toUpperCase();
  if (!t) return null;
  return SUBSECTOR_BY_TICKER[t] ?? null;
}
