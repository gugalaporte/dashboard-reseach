import "server-only";

import { getResearchSupabase } from "./supabase-research";
import type { CeoAnalise } from "./ceo-analise";

/** Carrega o dossiê de CEO pelo ticker B3. */
export async function loadCeoAnalise(ticker: string): Promise<CeoAnalise | null> {
  const t = ticker.trim().toUpperCase();
  if (!t) throw new Error("Ticker obrigatório");

  const db = getResearchSupabase();
  const { data, error } = await db
    .from("ceo_analise")
    .select(
      "ticker,company_name,ceo_name,synthesis_ceo,synthesis_veredito,synthesis_text,alignment_veredito,risk_level,track_record_report,alignment_report,updated_at"
    )
    .eq("ticker", t)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    ticker: String(data.ticker ?? t),
    companyName: (data.company_name as string | null) ?? null,
    ceoName: (data.ceo_name as string | null) ?? null,
    synthesisCeo: (data.synthesis_ceo as string | null) ?? null,
    synthesisVeredito: (data.synthesis_veredito as string | null) ?? null,
    synthesisText: (data.synthesis_text as string | null) ?? null,
    alignmentVeredito: (data.alignment_veredito as string | null) ?? null,
    riskLevel: (data.risk_level as string | null) ?? null,
    trackRecordReport: (data.track_record_report as string | null) ?? null,
    alignmentReport: (data.alignment_report as string | null) ?? null,
    updatedAt: (data.updated_at as string | null) ?? null,
  };
}
