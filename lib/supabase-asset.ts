import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Cliente Supabase do BancoAsset (service role, apenas server-side). */
export function getAssetSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_ASSET_URL;
  const key = process.env.SUPABASE_ASSET_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      "Variáveis SUPABASE_ASSET_URL e SUPABASE_ASSET_SERVICE_KEY não configuradas (adicione no Vercel → Settings → Environment Variables)."
    );
  }

  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
