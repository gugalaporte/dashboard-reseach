import { displayTicker } from "./finacap-book";
import { formatNumber } from "./format";
import { issuerKey } from "./governanca-portfolio";

/** Nome na CVM (vlmo_movimentacoes.nome_companhia) da empresa listada. */
const CVM_NAME_BY_ISSUER: Record<string, string> = {
  ALOS: "ALLOS S.A.",
  AXIA: "AXIA ENERGIA S.A.",
  AZUL: "AZUL S.A.",
  BPAC: "BANCO BTG PACTUAL S/A",
  BRBI: "BRBI BR PARTNERS S.A",
  DXCO: "DEXCO S.A.",
  ENGI: "ENERGISA SA",
  EQTL: "EQUATORIAL S.A.",
  GOAU: "METALURGICA GERDAU SA",
  INBR: "INTER & CO, INC.",
  ITUB: "ITAÚ UNIBANCO HOLDING S.A.",
  LOGG: "LOG COMMERCIAL PROPERTIES E PARTICIPAÇÕES",
  LREN: "LOJAS RENNER SA",
  MRVE: "MRV ENGENHARIA E PARTICIPAÇÕES S/A",
  PETR: "PETRÓLEO BRASILEIRO S.A. - PETROBRAS",
  POMO: "MARCOPOLO SA",
  POSI: "POSITIVO TECNOLOGIA S.A.",
  PSSA: "PORTO SEGURO SA",
  RAPT: "RANDONCORP S.A.",
  SLCE: "SLC AGRICOLA SA",
  SUZB: "SUZANO S.A.",
  TEND: "CONSTRUTORA TENDA S/A",
  TIMS: "TIM S.A.",
  VALE: "VALE S.A.",
  VBBR: "VIBRA ENERGIA S/A",
  VIVA: "VIVARA PARTICIPAÇÕES S.A.",
  VIVT: "TELEFÔNICA BRASIL S.A.",
  VTRU: "VITRU EDUCAÇÃO S.A.",
};

const CLASS_RANK: Record<string, number> = { "3": 0, "4": 1, "11": 2 };

export type InsiderTrade = {
  id: number;
  ticker: string;
  company: string;
  date: string;
  versao: number;
  cargo: string | null;
  movimentacao: string;
  valorMobiliario: string | null;
  quantidade: number | null;
  preco: number | null;
  volume: number | null;
};

/** Posição do Saldo inicial, somada por empresa e cargo. */
export type OpeningPosition = {
  ticker: string;
  cargo: string;
  quantidade: number;
};

export type InsiderPayload = {
  month: string | null;
  months: string[];
  rows: InsiderTrade[];
  opening: OpeningPosition[];
};

export type InsiderTotals = {
  buys: number;
  sells: number;
  buyVolume: number;
  sellVolume: number;
  buyQty: number;
  sellQty: number;
  /** Compras menos vendas. */
  netVolume: number;
};

/** Soma de compras e vendas do mês. */
export function tradeTotals(rows: InsiderTrade[]): InsiderTotals {
  const totals: InsiderTotals = {
    buys: 0,
    sells: 0,
    buyVolume: 0,
    sellVolume: 0,
    buyQty: 0,
    sellQty: 0,
    netVolume: 0,
  };
  for (const row of rows) {
    const volume = row.volume ?? 0;
    const qty = Math.abs(row.quantidade ?? 0);
    if (normMove(row.movimentacao).startsWith("compra")) {
      totals.buys += 1;
      totals.buyVolume += volume;
      totals.buyQty += qty;
    } else if (normMove(row.movimentacao).startsWith("venda")) {
      totals.sells += 1;
      totals.sellVolume += volume;
      totals.sellQty += qty;
    }
  }
  totals.netVolume = totals.buyVolume - totals.sellVolume;
  return totals;
}

export type CompanyTotals = InsiderTotals & { ticker: string };

/** Total de compras e vendas de cada empresa. */
export function totalsByCompany(rows: InsiderTrade[]): CompanyTotals[] {
  const byTicker = new Map<string, InsiderTrade[]>();
  for (const row of rows) {
    const list = byTicker.get(row.ticker) ?? [];
    list.push(row);
    byTicker.set(row.ticker, list);
  }
  return [...byTicker.entries()]
    .map(([ticker, list]) => ({ ticker, ...tradeTotals(list) }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker, "pt"));
}

export type InsiderCargoGroup = InsiderTotals & {
  cargo: string;
  rows: InsiderTrade[];
};

const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const CARGO_ORDER = [
  "Conselho de Administração ou Vinculado",
  "Diretor ou Vinculado",
  "Conselho Fiscal ou Vinculado",
  "Órgão Estatutário ou Vinculado",
  "Controlador ou Vinculado",
];

/** yyyy-mm a partir de uma data ISO. */
export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

function isoDay(value: unknown): string {
  const day = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "";
}

/**
 * Dia da compra ou venda.
 * data_referencia da CVM é o dia 1 do mês do informe. A data real está em data_movimentacao.
 */
export function tradeIso(movement: unknown, reference: unknown): string {
  return isoDay(movement) || isoDay(reference);
}

/** Rótulo do mês, ex.: setembro 2026. */
export function formatMonthLabel(month: string): string {
  const [year, raw] = month.split("-");
  const name = MONTHS_PT[Number(raw) - 1];
  return name && year ? `${name} ${year}` : month;
}

/** Intervalo [início, fim) do mês yyyy-mm. */
export function monthRange(month: string): { start: string; end: string } | null {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const mon = Number(match[2]);
  if (mon < 1 || mon > 12) return null;
  const start = `${match[1]}-${match[2]}-01`;
  const end =
    mon === 12
      ? `${year + 1}-01-01`
      : `${match[1]}-${String(mon + 1).padStart(2, "0")}-01`;
  return { start, end };
}

/** Compara tipo_movimentacao sem acento. */
export function normMove(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const TRADES = new Set([
  "compra",
  "compra a vista",
  "compra avista",
  "compra a termo",
  "compra termo",
  "venda",
  "venda a vista",
  "venda avista",
  "venda a termo",
  "venda termo",
]);

export function isInsiderTrade(tipo: string | null | undefined): boolean {
  return TRADES.has(normMove(tipo));
}

export function isOpeningBalance(tipo: string | null | undefined): boolean {
  return normMove(tipo) === "saldo inicial";
}

/** |quantidade negociada| / soma dos saldos iniciais, em porcentagem. */
export function positionShare(tradedQty: number, openingQty: number): number | null {
  const traded = Math.abs(tradedQty);
  if (!(openingQty > 0)) return null;
  return (traded / openingQty) * 100;
}

/** Percentual da posição, arredondado em duas casas. */
export function formatPositionShare(pct: number): string {
  return `${formatNumber(pct, 2)}%`;
}

/** Soma o Saldo inicial de cada empresa e cargo. */
export function sumOpeningPositions(
  rows: OpeningPosition[]
): OpeningPosition[] {
  const map = new Map<string, OpeningPosition>();
  for (const row of rows) {
    const key = `${row.ticker}|${row.cargo}`;
    const current = map.get(key);
    if (current) current.quantidade += row.quantidade;
    else map.set(key, { ticker: row.ticker, cargo: row.cargo, quantidade: row.quantidade });
  }
  return [...map.values()];
}

function classRank(ticker: string): number {
  const m = displayTicker(ticker).match(/^[A-Z]{4}(\d+)/);
  const cls = m?.[1] ?? "999";
  return CLASS_RANK[cls] ?? 10 + Number(cls || 999);
}

/** Um ticker de exibição por emissor da carteira que conhecemos na CVM. */
export function portfolioIssuers(
  tickers: string[]
): { ticker: string; cvmName: string }[] {
  const byIssuer = new Map<string, string[]>();
  for (const raw of tickers) {
    const ticker = displayTicker(raw);
    if (!ticker) continue;
    const key = issuerKey(ticker);
    const list = byIssuer.get(key) ?? [];
    list.push(ticker);
    byIssuer.set(key, list);
  }

  const out: { ticker: string; cvmName: string }[] = [];
  for (const [issuer, list] of byIssuer) {
    const cvmName = CVM_NAME_BY_ISSUER[issuer];
    if (!cvmName) continue;
    list.sort((a, b) => classRank(a) - classRank(b) || a.localeCompare(b));
    out.push({ ticker: list[0]!, cvmName });
  }
  return out.sort((a, b) => a.ticker.localeCompare(b.ticker));
}

/** Agrupa as operações pelo tipo de cargo. */
export function groupByCargo(rows: InsiderTrade[]): InsiderCargoGroup[] {
  const byCargo = new Map<string, InsiderTrade[]>();
  for (const row of rows) {
    const cargo = row.cargo?.trim() || "Sem cargo";
    const list = byCargo.get(cargo) ?? [];
    list.push(row);
    byCargo.set(cargo, list);
  }

  return [...byCargo.entries()]
    .map(([cargo, list]) => ({ cargo, rows: list, ...tradeTotals(list) }))
    .sort((a, b) => {
      const ai = CARGO_ORDER.indexOf(a.cargo);
      const bi = CARGO_ORDER.indexOf(b.cargo);
      const ar = ai === -1 ? CARGO_ORDER.length : ai;
      const br = bi === -1 ? CARGO_ORDER.length : bi;
      if (ar !== br) return ar - br;
      return a.cargo.localeCompare(b.cargo, "pt");
    });
}

export function tickerByCvmName(
  issuers: { ticker: string; cvmName: string }[]
): Map<string, string> {
  return new Map(issuers.map((i) => [i.cvmName, i.ticker]));
}

type VersionRow = { cnpj: string; refDate: string; versao: number };

/**
 * Em cada companhia e data de referência, fica só a versão maior.
 * Versão maior é a mais recente. A data da operação não entra nessa chave.
 */
export function keepLatestVersion<T extends VersionRow>(rows: T[]): T[] {
  const max = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.cnpj}|${row.refDate}`;
    const cur = max.get(key);
    if (cur == null || row.versao > cur) max.set(key, row.versao);
  }
  return rows.filter((row) => row.versao === max.get(`${row.cnpj}|${row.refDate}`));
}
