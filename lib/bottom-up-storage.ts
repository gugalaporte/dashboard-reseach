/** Persistência local de notas qualitativas e pipeline (por ticker). */

import type { BottomUpNotes, PipelineStatus } from "./bottom-up-types";

const STORAGE_KEY = "finacap-bottom-up-notes-v1";

function empty(ticker: string): BottomUpNotes {
  return {
    ticker: ticker.toUpperCase(),
    status: "watchlist",
    thesis: "",
    moat: "",
    governance: "",
    updatedAt: null,
  };
}

function readAll(): Record<string, BottomUpNotes> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, BottomUpNotes>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(map: Record<string, BottomUpNotes>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function loadBottomUpNotes(ticker: string): BottomUpNotes {
  const t = ticker.trim().toUpperCase();
  const all = readAll();
  return all[t] ?? empty(t);
}

export function saveBottomUpNotes(
  ticker: string,
  patch: Partial<Omit<BottomUpNotes, "ticker">>
): BottomUpNotes {
  const t = ticker.trim().toUpperCase();
  const all = readAll();
  const next: BottomUpNotes = {
    ...empty(t),
    ...all[t],
    ...patch,
    ticker: t,
    updatedAt: new Date().toISOString(),
  };
  all[t] = next;
  writeAll(all);
  return next;
}

export function setPipelineStatus(
  ticker: string,
  status: PipelineStatus
): BottomUpNotes {
  return saveBottomUpNotes(ticker, { status });
}
