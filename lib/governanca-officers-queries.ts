import "server-only";

import { getResearchSupabase } from "./supabase-research";
import { blankToNull } from "./governanca-board";
import { sortOfficers, type Officer } from "./governanca-officers";

function intOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function boolOrNull(v: unknown): boolean | null {
  if (v === true || v === false) return v;
  return null;
}

/** Carrega diretores estatutários pelo ticker B3. */
export async function loadOfficers(ticker: string): Promise<Officer[]> {
  const t = ticker.trim().toUpperCase();
  if (!t) throw new Error("Ticker obrigatório");

  const db = getResearchSupabase();
  const { data, error } = await db
    .from("executive_officers")
    .select(
      "id,ticker,officer_name,role_label,is_statutory,is_board_member,election_date,mandate_info,start_date_role,bio,source_url,display_order"
    )
    .eq("ticker", t)
    .order("display_order", { ascending: true });
  if (error) throw error;

  const rows = (data ?? [])
    .map((row) => {
      const name = blankToNull(row.officer_name as string | null) ?? "";
      return {
        id: intOrNull(row.id) ?? 0,
        ticker: String(row.ticker ?? t),
        name,
        roleLabel: blankToNull(row.role_label as string | null),
        isStatutory: boolOrNull(row.is_statutory),
        isBoardMember: boolOrNull(row.is_board_member),
        electionDate: blankToNull(row.election_date as string | null),
        mandateInfo: blankToNull(row.mandate_info as string | null),
        startDateRole: blankToNull(row.start_date_role as string | null),
        bio: blankToNull(row.bio as string | null),
        sourceUrl: blankToNull(row.source_url as string | null),
        displayOrder: intOrNull(row.display_order) ?? 0,
      } satisfies Officer;
    })
    .filter((o) => o.name && o.isStatutory !== false);

  return sortOfficers(rows);
}
