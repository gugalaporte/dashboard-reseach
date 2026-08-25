import "server-only";

import { getAssetSupabase } from "./supabase-asset";
import {
  blankToNull,
  toIsoDate,
  type ResultadoEvent,
} from "./governanca-calendario";

function intOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

/** Carrega as datas de divulgação (BancoAsset.resultados). */
export async function loadResultados(): Promise<ResultadoEvent[]> {
  const db = getAssetSupabase();
  const { data, error } = await db
    .from("resultados")
    .select("id,ticker,name,date")
    .order("date", { ascending: true });
  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const date = toIsoDate(row.date as string | null);
      const ticker = blankToNull(row.ticker as string | null)?.toUpperCase();
      if (!date || !ticker) return null;
      return {
        id: intOrNull(row.id) ?? 0,
        ticker,
        name: blankToNull(row.name as string | null),
        date,
      };
    })
    .filter((e): e is ResultadoEvent => e != null);
}
