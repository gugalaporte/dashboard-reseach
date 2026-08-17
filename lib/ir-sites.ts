/** Sites oficiais de Relações com Investidores (carteira). */

const IR_SITES: Record<string, string> = {
  ALOS3: "https://ri.allos.com.br/",
  AXIA3: "https://ri.axia.com.br/",
  AZUL4: "https://ri.voeazul.com.br/",
  BPAC11: "https://ri.btgpactual.com/",
  BRBI11: "https://ri.brpartners.com.br/",
  DXCO3: "https://ri.dex.co/",
  ENGI11: "https://ri.energisa.com.br/",
  EQTL3: "https://ri.equatorialenergia.com.br/",
  GOAU4: "https://ri.gerdau.com/",
  INBR32: "https://ri.inter.co/",
  ITUB4: "https://www.itau.com.br/relacoes-com-investidores/",
  LOGG3: "https://ri.logcp.com.br/",
  LREN3: "https://ri.lojasrenner.com.br/",
  MRVE3: "https://ri.mrv.com.br/",
  PETR4: "https://www.investidorpetrobras.com.br/",
  POMO4: "https://ri.marcopolo.com.br/",
  POSI3: "https://ri.positivotecnologia.com.br/",
  PSSA3: "https://ri.portoseguro.com.br/",
  RAPT3: "https://ri.randoncorp.com/",
  SLCE3: "https://ri.slcagricola.com.br/",
  SUZB3: "https://ri.suzano.com.br/",
  TEND3: "https://ri.tenda.com/",
  TIMS3: "https://ri.tim.com.br/",
  VALE3: "https://vale.com/pt/investidores",
  VBBR3: "https://ri.vibraenergia.com.br/",
  VIVA3: "https://ri.vivara.com.br/",
  VIVT3: "https://ri.telefonica.com.br/",
  VTRU3: "https://ri.vitru.com.br/",
};

export function irSiteForTicker(ticker: string): string | null {
  const t = ticker.trim().toUpperCase();
  return IR_SITES[t] ?? null;
}
