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
  updatedAt: string | null;
};

export type SeriesPoint = {
  date: string;
  roe: number | null;
  roic: number | null;
  ebitdaMargin: number | null;
  netMargin: number | null;
  netDebtEbitda: number | null;
  freeCashFlow: number | null;
  peRatio: number | null;
  evEbitda: number | null;
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

export type IntrinsicEstimate = {
  method: string;
  marketPrice: number | null;
  fairPrice: number | null;
  upsidePct: number | null;
  targetMultiple: number | null;
  currentMultiple: number | null;
  ebitda: number | null;
  netDebt: number | null;
  marketCap: number | null;
  notes: string;
};

export type BottomUpPayload = {
  ticker: string;
  ric: string;
  name: string | null;
  sector: string | null;
  series: SeriesPoint[];
  annual: AnnualPoint[];
  bands: MultipleBand[];
  intrinsic: IntrinsicEstimate;
  peerCount: number;
};
