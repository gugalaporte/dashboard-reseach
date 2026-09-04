/** Cliente da API de notas bottom-up (banco Research). */

import { loadBottomUpNotes } from "./bottom-up-storage";
import { shouldSeedFromLocal, type NotesPatch } from "./bottom-up-notes";
import type { BottomUpNotes } from "./bottom-up-types";

async function readJson(res: Response): Promise<BottomUpNotes> {
  const json = (await res.json()) as BottomUpNotes & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}

export async function persistBottomUpNotes(
  ticker: string,
  patch: NotesPatch
): Promise<BottomUpNotes> {
  const t = ticker.trim().toUpperCase();
  const res = await fetch(
    `/api/factors/bottom-up/notes?ticker=${encodeURIComponent(t)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }
  );
  return readJson(res);
}

export async function fetchBottomUpNotes(ticker: string): Promise<BottomUpNotes> {
  const t = ticker.trim().toUpperCase();
  const res = await fetch(
    `/api/factors/bottom-up/notes?ticker=${encodeURIComponent(t)}`,
    { cache: "no-store" }
  );
  const remote = await readJson(res);
  const local = loadBottomUpNotes(t);
  if (!shouldSeedFromLocal(remote, local)) return remote;

  return persistBottomUpNotes(t, {
    status: local.status,
    rating: local.rating,
    targetPrice: local.targetPrice,
    thesis: local.thesis,
    risk: local.risk,
    governance: local.governance,
  });
}
