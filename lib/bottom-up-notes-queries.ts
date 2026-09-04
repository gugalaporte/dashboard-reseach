import "server-only";

import { getResearchSupabase } from "./supabase-research";
import {
  emptyNotes,
  mergeNotes,
  notesToRow,
  rowToNotes,
  type NotesPatch,
} from "./bottom-up-notes";
import type { PipelineNote } from "./pipeline";
import type { BottomUpNotes } from "./bottom-up-types";

const SELECT =
  "ticker,status,rating,target_price,thesis,risk,governance,updated_at";

const MISSING_TABLE =
  "Tabela bottom_up_notes não existe. Rode supabase/migrations/20260904_bottom_up_notes.sql no SQL Editor do banco Research.";

function throwQueryError(error: { code?: string; message: string }): never {
  if (error.code === "PGRST205") throw new Error(MISSING_TABLE);
  throw new Error(error.message);
}

export async function loadBottomUpNotesFromDb(
  ticker: string
): Promise<BottomUpNotes> {
  const t = ticker.trim().toUpperCase();
  if (!t) throw new Error("Ticker obrigatório");

  const db = getResearchSupabase();
  const { data, error } = await db
    .from("bottom_up_notes")
    .select(SELECT)
    .eq("ticker", t)
    .maybeSingle();
  if (error) throwQueryError(error);
  if (!data) return emptyNotes(t);
  return rowToNotes(data);
}

export async function loadPipelineNotes(): Promise<PipelineNote[]> {
  const db = getResearchSupabase();
  const { data, error } = await db
    .from("bottom_up_notes")
    .select(SELECT)
    .order("updated_at", { ascending: false });
  if (error) throwQueryError(error);
  const notes = (data ?? []).map(rowToNotes);
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

  return notes.map((n) => {
    const meta = byTicker.get(n.ticker);
    return { ...n, name: meta?.name ?? null, sector: meta?.sector ?? null };
  });
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
