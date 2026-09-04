import { NextResponse } from "next/server";
import {
  loadBottomUpNotesFromDb,
  upsertBottomUpNotes,
} from "@/lib/bottom-up-notes-queries";
import {
  parseNotesRating,
  parsePipelineStatus,
  parseTargetPrice,
  type NotesPatch,
} from "@/lib/bottom-up-notes";
import { NOTES_RATINGS, PIPELINE_STEPS } from "@/lib/bottom-up-types";
import { hasResearchServiceKey } from "@/lib/supabase-research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = new Set<string>(PIPELINE_STEPS.map((s) => s.id));
const RATINGS = new Set<string>(NOTES_RATINGS.map((r) => r.id));

function tickerFrom(req: Request): string {
  return new URL(req.url).searchParams.get("ticker")?.trim().toUpperCase() ?? "";
}

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    if (!hasResearchServiceKey()) {
      return fail("SUPABASE_RESEARCH_SERVICE_KEY não configurada.", 500);
    }
    const ticker = tickerFrom(req);
    if (!ticker) return fail("Informe ?ticker= (ex.: POMO4)", 400);
    const notes = await loadBottomUpNotesFromDb(ticker);
    return NextResponse.json(notes, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/factors/bottom-up/notes GET]", e);
    const message = e instanceof Error ? e.message : "Erro ao carregar notas";
    return fail(message, 500);
  }
}

function parsePatch(body: unknown): NotesPatch | string {
  if (!body || typeof body !== "object") return "Body JSON inválido";
  const raw = body as Record<string, unknown>;
  const patch: NotesPatch = {};
  if ("status" in raw) {
    if (raw.status === null || raw.status === "") {
      patch.status = null;
    } else if (typeof raw.status !== "string" || !STATUSES.has(raw.status)) {
      return "status inválido";
    } else {
      patch.status = parsePipelineStatus(raw.status);
    }
  }
  if ("rating" in raw) {
    if (raw.rating === null || raw.rating === "") {
      patch.rating = null;
    } else if (typeof raw.rating !== "string" || !RATINGS.has(raw.rating)) {
      return "rating inválido";
    } else {
      patch.rating = parseNotesRating(raw.rating);
    }
  }
  if ("targetPrice" in raw) {
    if (raw.targetPrice === null || raw.targetPrice === "") {
      patch.targetPrice = null;
    } else {
      const n = parseTargetPrice(raw.targetPrice);
      if (n == null) return "targetPrice inválido";
      patch.targetPrice = n;
    }
  }
  for (const key of ["thesis", "risk", "governance"] as const) {
    if (key in raw) {
      if (typeof raw[key] !== "string") return `${key} deve ser texto`;
      patch[key] = raw[key];
    }
  }
  return patch;
}

export async function PUT(req: Request) {
  try {
    if (!hasResearchServiceKey()) {
      return fail("SUPABASE_RESEARCH_SERVICE_KEY não configurada.", 500);
    }
    const ticker = tickerFrom(req);
    if (!ticker) return fail("Informe ?ticker= (ex.: POMO4)", 400);
    const parsed = parsePatch(await req.json());
    if (typeof parsed === "string") return fail(parsed, 400);
    const notes = await upsertBottomUpNotes(ticker, parsed);
    return NextResponse.json(notes, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[api/factors/bottom-up/notes PUT]", e);
    const message = e instanceof Error ? e.message : "Erro ao salvar notas";
    return fail(message, 500);
  }
}
