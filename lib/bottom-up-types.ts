/** Tipos do módulo Bottom-up analysis (screening). */

export type PipelineStatus = "watchlist" | "thesis_ready" | "position";

export const PIPELINE_STEPS: Array<{ id: PipelineStatus; label: string }> = [
  { id: "watchlist", label: "Watchlist" },
  { id: "thesis_ready", label: "Tese pronta" },
  { id: "position", label: "Posição" },
];

export type NotesRating = "sell" | "neutral" | "buy";

export const NOTES_RATINGS: Array<{ id: NotesRating; label: string }> = [
  { id: "sell", label: "Sell" },
  { id: "neutral", label: "Neutral" },
  { id: "buy", label: "Buy" },
];

export type BottomUpNotes = {
  ticker: string;
  status: PipelineStatus | null;
  rating: NotesRating | null;
  targetPrice: number | null;
  thesis: string;
  risk: string;
  governance: string;
  comments: string;
  updatedAt: string | null;
};

export type SeriesPoint = {
  date: string;
  /** Rótulo do eixo (1T23, 2024). Se vazio, usa o ano da data. */
  label?: string;
  roe: number | null;
  roic: number | null;
  ebitda?: number | null;
  ebitdaMargin: number | null;
  netMargin: number | null;
  netDebtEbitda: number | null;
  freeCashFlow: number | null;
  peRatio: number | null;
  evEbitda: number | null;
  pbRatio?: number | null;
  price: number | null;
};

export type AnnualPoint = {
  year: number;
  label: string;
  revenue: number | null;
  ebitda: number | null;
  netIncome: number | null;
  freeCashFlow: number | null;
  totalDebt: number | null;
};

export type MultipleBand = {
  key: "pe" | "evEbitda";
  label: string;
  current: number | null;
  min: number | null;
  avg: number | null;
  max: number | null;
  peerMedian: number | null;
};

export type PriceTarget = {
  method: "EV/EBITDA" | "P/L" | "P/BV";
  source: "histórico" | "setor";
  multiple: number;
  price: number;
  upsidePct: number;
  lines: string[];
};

/** Preço justo: EV/EBITDA histórico (ou do setor) sobre o EBITDA implícito no múltiplo atual. */
export type FairPriceView = {
  method: string;
  marketPrice: number | null;
  fairPrice: number | null;
  upsidePct: number | null;
  targetMultiple: number | null;
  currentMultiple: number | null;
  ebitda: number | null;
  netDebt: number | null;
  grossDebt: number | null;
  cash: number | null;
  marketCap: number | null;
  marketCapCurrency: string | null;
  notes: string;
};

export type IntrinsicEstimate = {
  method: string;
  marketPrice: number | null;
  fairPrice: number | null;
  upsidePct: number | null;
  targetMultiple: number | null;
  currentMultiple: number | null;
  /** Seção de cima: a conta de preço justo que já existia. */
  justo: FairPriceView | null;
  /** Preços alvo por múltiplo e por base (histórico do papel ou mediana do setor). */
  targets: PriceTarget[];
  ebitda: number | null;
  netDebt: number | null;
  /** Dívida bruta do balanço. Com caixa, a líquida é dívida − caixa. */
  grossDebt: number | null;
  cash: number | null;
  marketCap: number | null;
  /** Moeda de market cap e enterprise value na mesma linha do snapshot. */
  marketCapCurrency: string | null;
  notes: string;
};

export type BottomUpPayload = {
  ticker: string;
  ric: string;
  name: string | null;
  sector: string | null;
  series: SeriesPoint[];
  annual: AnnualPoint[];
  /** Margens e alavancagem: trimestre se a base tiver, senão ano. */
  fiscal: SeriesPoint[];
  bands: MultipleBand[];
  intrinsic: IntrinsicEstimate;
  peerCount: number;
  /** Tickers do mesmo setor LSEG que entram na mediana. */
  peers: string[];
};
