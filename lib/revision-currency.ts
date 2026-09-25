import { normalizeCcy, sameCcy } from "./currency";
import type { RevisionEvent, RevisionEventType } from "@/types/revisions";

export type TargetCcyRow = {
  empresa: string;
  pdf_id: number | null;
  valor: number;
  unidade: string | null;
};

type RevisionLike = Pick<
  RevisionEvent,
  | "ticker"
  | "pdf_id"
  | "prev_pdf_id"
  | "target_price"
  | "prev_target_price"
  | "tp_change_pct"
  | "tp_direction"
  | "event_type"
>;

function roundKey(v: number): string {
  return Number(v).toFixed(4);
}

function tickerKey(ticker: string): string {
  return ticker.trim().toUpperCase();
}

export function buildTargetCcyLookup(rows: TargetCcyRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of rows) {
    if (r.pdf_id == null) continue;
    const ccy = normalizeCcy(r.unidade);
    if (!ccy) continue;
    const t = tickerKey(r.empresa);
    map.set(`${t}|${r.pdf_id}|${roundKey(r.valor)}`, ccy);
    map.set(`${t}|${r.pdf_id}`, ccy);
  }
  return map;
}

export function lookupTargetCcy(
  lookup: Map<string, string>,
  ticker: string,
  pdfId: number | null,
  value: number | null
): string | null {
  if (pdfId == null) return null;
  const t = tickerKey(ticker);
  if (value != null) {
    const exact = lookup.get(`${t}|${pdfId}|${roundKey(value)}`);
    if (exact) return exact;
  }
  return lookup.get(`${t}|${pdfId}`) ?? null;
}

function comparableTargets(r: RevisionLike, prevCcy: string | null, currCcy: string | null): boolean {
  if (r.prev_target_price == null || r.target_price == null) return true;
  return sameCcy(prevCcy, currCcy);
}

/** Anula corte/alta quando o target anterior e o atual estão em moedas diferentes. */
export function applyRevisionCurrency<T extends RevisionLike>(
  r: T,
  lookup: Map<string, string>
): (T & { target_ccy: string | null; prev_target_ccy: string | null }) | null {
  const target_ccy = lookupTargetCcy(lookup, r.ticker, r.pdf_id, r.target_price);
  const prev_target_ccy = lookupTargetCcy(
    lookup,
    r.ticker,
    r.prev_pdf_id,
    r.prev_target_price
  );
  const next = { ...r, target_ccy, prev_target_ccy };

  if (comparableTargets(r, prev_target_ccy, target_ccy)) {
    return next;
  }

  next.tp_change_pct = null;
  next.tp_direction = null;
  if (r.event_type === "tp_change") return null;
  if (r.event_type === "rating_and_tp_change") {
    next.event_type = "rating_change" as RevisionEventType;
  }
  return next;
}
