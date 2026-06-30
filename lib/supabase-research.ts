import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Cliente Supabase Research com service role (server-only, tabelas LSEG). */
export function getResearchSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_RESEARCH_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      "Variáveis NEXT_PUBLIC_SUPABASE_URL e SUPABASE_RESEARCH_SERVICE_KEY não configuradas."
    );
  }

  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
