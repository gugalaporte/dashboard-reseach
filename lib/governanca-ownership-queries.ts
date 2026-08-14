import "server-only";

import { getResearchSupabase } from "./supabase-research";
import { resolveRicForTicker } from "./lseg-series";
import {
  blankToNull,
  num,
  type OwnershipHolder,
  type OwnershipPayload,
} from "./governanca-ownership";

type HolderRow = {
  as_of_date: string | null;
  investor_name: string | null;
  investor_type: string | null;
  investor_parent_type: string | null;
  shares_held: number | string | null;
  pct_held: number | string | null;
  holdings_date: string | null;
};

/** Snapshot mais recente de acionistas + controladores LSEG. */
export async function loadOwnership(ticker: string): Promise<OwnershipPayload> {
  const t = ticker.trim().toUpperCase();
  if (!t) throw new Error("Ticker obrigatório");

  const db = getResearchSupabase();
  const { data: company, error: cErr } = await db
    .from("companies")
    .select("ticker,ric,name,immediate_parent,ultimate_parent")
    .eq("ticker", t)
    .maybeSingle();
  if (cErr) throw cErr;

  const ric =
    blankToNull(company?.ric as string | null) ?? (await resolveRicForTicker(t));

  const { data: raw, error: hErr } = await db
    .from("latest_ownership_holders")
    .select(
      "as_of_date,investor_name,investor_type,investor_parent_type,shares_held,pct_held,holdings_date"
    )
    .eq("ric", ric)
    .order("pct_held", { ascending: false });
  if (hErr) throw hErr;

  const rows = (raw ?? []) as HolderRow[];
  const holders: OwnershipHolder[] = rows
    .map((r) => ({
      name: blankToNull(r.investor_name) ?? "",
      type: blankToNull(r.investor_type),
      parentType: blankToNull(r.investor_parent_type),
      shares: num(r.shares_held),
      pct: num(r.pct_held),
      holdingsDate: blankToNull(r.holdings_date)?.slice(0, 10) ?? null,
    }))
    .filter((h) => h.name);

  const asOf =
    blankToNull(rows[0]?.as_of_date)?.slice(0, 10) ?? null;

  return {
    ticker: t,
    ric,
    asOf,
    companyName: blankToNull(company?.name as string | null),
    immediateParent: blankToNull(company?.immediate_parent as string | null),
    ultimateParent: blankToNull(company?.ultimate_parent as string | null),
    holders,
  };
}
