import "server-only";

import { getResearchSupabase } from "./supabase-research";
import {
  emptyNotes,
  mergeNotes,
  notesToRow,
  rowToNotes,
  type NotesPatch,
} from "./bottom-up-notes";
import { sortPipelineByDate, type PipelineNote } from "./pipeline";
import type { BottomUpNotes } from "./bottom-up-types";

const SELECT_BASE =
  "ticker,status,rating,target_price,thesis,risk,governance,updated_at";
const SELECT = `${SELECT_BASE},comments`;

const MISSING_TABLE =
  "Tabela bottom_up_notes não existe. Rode supabase/migrations/20260904_bottom_up_notes.sql no SQL Editor do banco Research.";
const MISSING_COMMENTS =
  "Falta a coluna comments. Rode supabase/migrations/20261015_bottom_up_notes_comments.sql no SQL Editor do banco Research.";

function missingComments(error: { message: string }): boolean {
  return /comments/i.test(error.message) && /does not exist|schema cache/i.test(error.message);
}

function commentsFrom(row: object): string | null {
  if (!("comments" in row)) return "";
  const value = (row as { comments?: unknown }).comments;
  return typeof value === "string" ? value : null;
}

function throwQueryError(error: { code?: string; message: string }): never {
  if (error.code === "PGRST205") throw new Error(MISSING_TABLE);
  if (missingComments(error)) throw new Error(MISSING_COMMENTS);
  throw new Error(error.message);
}

export async function loadBottomUpNotesFromDb(
  ticker: string
): Promise<BottomUpNotes> {
  const t = ticker.trim().toUpperCase();
  if (!t) throw new Error("Ticker obrigatório");

  const db = getResearchSupabase();
  const first = await db
    .from("bottom_up_notes")
    .select(SELECT)
    .eq("ticker", t)
    .maybeSingle();
  if (first.error && missingComments(first.error)) {
    const second = await db
      .from("bottom_up_notes")
      .select(SELECT_BASE)
      .eq("ticker", t)
      .maybeSingle();
    if (second.error) throwQueryError(second.error);
    if (!second.data) return emptyNotes(t);
    return rowToNotes({ ...second.data, comments: "" });
  }
  if (first.error) throwQueryError(first.error);
  if (!first.data) return emptyNotes(t);
  return rowToNotes(first.data);
}

export async function loadPipelineNotes(): Promise<PipelineNote[]> {
  const db = getResearchSupabase();
  const first = await db
    .from("bottom_up_notes")
    .select(SELECT)
    .order("updated_at", { ascending: false, nullsFirst: false });
  const rows = first.error && missingComments(first.error)
    ? await db
        .from("bottom_up_notes")
        .select(SELECT_BASE)
        .order("updated_at", { ascending: false, nullsFirst: false })
    : first;
  if (rows.error) throwQueryError(rows.error);
  const notes = (rows.data ?? []).map((row) =>
    rowToNotes({ ...row, comments: commentsFrom(row) })
  );
  if (notes.length === 0) return [];

  const tickers = notes.map((n) => n.ticker);
  const { data: companies } = await db
    .from("companies")
    .select("ticker,name,sector")
    .in("ticker", tickers);

  const byTicker = new Map<
    string,
    { name: string | null; sector: string | null }
  >();
  for (const c of companies ?? []) {
    const ticker = String(c.ticker ?? "").trim().toUpperCase();
    if (!ticker) continue;
    byTicker.set(ticker, {
      name: (c.name as string | null) ?? null,
      sector: (c.sector as string | null) ?? null,
    });
  }

  return sortPipelineByDate(
    notes.map((n) => {
      const meta = byTicker.get(n.ticker);
      return { ...n, name: meta?.name ?? null, sector: meta?.sector ?? null };
    })
  );
}

export async function upsertBottomUpNotes(
  ticker: string,
  patch: NotesPatch
): Promise<BottomUpNotes> {
  const current = await loadBottomUpNotesFromDb(ticker);
  const next = mergeNotes(current, patch);
  const db = getResearchSupabase();
  const { data, error } = await db
    .from("bottom_up_notes")
    .upsert(notesToRow(next), { onConflict: "ticker" })
    .select(SELECT)
    .single();
  if (error) throwQueryError(error);
  return rowToNotes(data);
}
