import "server-only";

import { getResearchSupabase } from "./supabase-research";
import { blankToNull, toIsoDate } from "./governanca-calendario";
import {
  mondayIso,
  relatedTickers,
  sortWeekEvents,
  type GovernancaEvento,
} from "./governanca-eventos";
import { displayTicker } from "./finacap-book";

function intOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function mapRow(row: Record<string, unknown>): GovernancaEvento | null {
  const ticker = blankToNull(row.ticker as string | null)?.toUpperCase();
  const titulo = blankToNull(row.titulo as string | null);
  if (!ticker || !titulo) return null;
  return {
    id: intOrNull(row.id) ?? 0,
    ticker: displayTicker(ticker),
    companyName: blankToNull(row.company_name as string | null),
    semanaRef: toIsoDate(row.semana_ref as string | null) ?? "",
    janelaInicio: toIsoDate(row.janela_inicio as string | null),
    janelaFim: toIsoDate(row.janela_fim as string | null),
    dataEvento: (row.data_evento as string | null) ?? null,
    tipo: blankToNull(row.tipo as string | null),
    categoria: blankToNull(row.categoria as string | null),
    titulo,
    resumo: blankToNull(row.resumo as string | null),
    relevancia: blankToNull(row.relevancia as string | null),
    destaque: Boolean(row.destaque),
    destaqueOrdem: intOrNull(row.destaque_ordem),
    fonteNome: blankToNull(row.fonte_nome as string | null),
    fonteUrl: blankToNull(row.fonte_url as string | null),
  };
}

/** Eventos da semana corrente; opcionalmente de um ticker. */
export async function loadEventosDaSemana(
  ticker?: string | null
): Promise<GovernancaEvento[]> {
  const db = getResearchSupabase();
  const semana = mondayIso();
  let q = db
    .from("governanca_eventos")
    .select(
      "id,ticker,company_name,semana_ref,janela_inicio,janela_fim,data_evento,tipo,categoria,titulo,resumo,relevancia,destaque,destaque_ordem,fonte_nome,fonte_url"
    )
    .eq("semana_ref", semana);

  if (ticker?.trim()) {
    q = q.in("ticker", relatedTickers(ticker));
  }

  const { data, error } = await q;
  if (error) throw error;

  const events = (data ?? [])
    .map((row) => mapRow(row as Record<string, unknown>))
    .filter((e): e is GovernancaEvento => e != null && e.semanaRef === semana);

  return sortWeekEvents(events);
}
