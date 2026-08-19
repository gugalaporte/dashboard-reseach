import "server-only";

import { getResearchSupabase } from "./supabase-research";
import { blankToNull, type BoardMember } from "./governanca-board";

function intOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function boolOrNull(v: unknown): boolean | null {
  if (v === true || v === false) return v;
  return null;
}

/** Carrega os membros do conselho pelo ticker B3. */
export async function loadBoardMembers(
  ticker: string
): Promise<BoardMember[]> {
  const t = ticker.trim().toUpperCase();
  if (!t) throw new Error("Ticker obrigatório");

  const db = getResearchSupabase();
  const { data, error } = await db
    .from("board_members")
    .select(
      "id,ticker,council_type,member_name,role_label,is_independent,election_date,mandate_info,bio,nominated_by,display_order"
    )
    .eq("ticker", t)
    .order("display_order", { ascending: true });
  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const name = blankToNull(row.member_name as string | null) ?? "";
      return {
        id: intOrNull(row.id) ?? 0,
        ticker: String(row.ticker ?? t),
        councilType:
          blankToNull(row.council_type as string | null) ?? "Outros",
        name,
        roleLabel: blankToNull(row.role_label as string | null),
        isIndependent: boolOrNull(row.is_independent),
        electionDate: blankToNull(row.election_date as string | null),
        mandateInfo: blankToNull(row.mandate_info as string | null),
        bio: blankToNull(row.bio as string | null),
        nominatedBy: blankToNull(row.nominated_by as string | null),
        displayOrder: intOrNull(row.display_order) ?? 0,
      };
    })
    .filter((m) => m.name);
}
