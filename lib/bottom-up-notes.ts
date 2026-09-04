import {
  NOTES_RATINGS,
  PIPELINE_STEPS,
  type BottomUpNotes,
  type NotesRating,
  type PipelineStatus,
} from "./bottom-up-types";

const STATUSES = new Set<string>(PIPELINE_STEPS.map((s) => s.id));
const RATINGS = new Set<string>(NOTES_RATINGS.map((r) => r.id));

export type NotesPatch = Partial<
  Pick<
    BottomUpNotes,
    "status" | "rating" | "targetPrice" | "thesis" | "risk" | "governance"
  >
>;

export type NotesRow = {
  ticker: string;
  status: string | null;
  rating: string | null;
  target_price: number | string | null;
  thesis: string | null;
  risk: string | null;
  governance: string | null;
  updated_at: string | null;
};

export function parsePipelineStatus(v: unknown): PipelineStatus | null {
  if (v === "analyzing") return "watchlist";
  if (typeof v === "string" && STATUSES.has(v)) return v as PipelineStatus;
  return null;
}

export function parseNotesRating(v: unknown): NotesRating | null {
  if (typeof v === "string" && RATINGS.has(v)) return v as NotesRating;
  return null;
}

export function parseTargetPrice(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n =
    typeof v === "number" ? v : Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function emptyNotes(ticker: string): BottomUpNotes {
  return {
    ticker: ticker.trim().toUpperCase(),
    status: null,
    rating: null,
    targetPrice: null,
    thesis: "",
    risk: "",
    governance: "",
    updatedAt: null,
  };
}

export function rowToNotes(row: NotesRow): BottomUpNotes {
  return {
    ticker: String(row.ticker ?? "").trim().toUpperCase(),
    status: parsePipelineStatus(row.status),
    rating: parseNotesRating(row.rating),
    targetPrice: parseTargetPrice(row.target_price),
    thesis: row.thesis ?? "",
    risk: row.risk ?? "",
    governance: row.governance ?? "",
    updatedAt: row.updated_at ?? null,
  };
}

export function notesToRow(n: BottomUpNotes): NotesRow {
  return {
    ticker: n.ticker,
    status: n.status,
    rating: n.rating,
    target_price: n.targetPrice,
    thesis: n.thesis,
    risk: n.risk,
    governance: n.governance,
    updated_at: n.updatedAt ?? new Date().toISOString(),
  };
}

export function mergeNotes(base: BottomUpNotes, patch: NotesPatch): BottomUpNotes {
  return {
    ...base,
    ...patch,
    ticker: base.ticker,
    updatedAt: new Date().toISOString(),
  };
}

/** Tem conteúdo local digno de copiar para o banco. */
export function notesHaveContent(n: BottomUpNotes): boolean {
  return Boolean(
    n.updatedAt ||
      n.rating ||
      n.targetPrice != null ||
      n.thesis.trim() ||
      n.risk.trim() ||
      n.governance.trim()
  );
}

/** Banco vazio + rascunho local → promover na primeira leitura. */
export function shouldSeedFromLocal(
  remote: BottomUpNotes,
  local: BottomUpNotes
): boolean {
  return !remote.updatedAt && notesHaveContent(local);
}
