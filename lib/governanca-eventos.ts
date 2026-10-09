import { isoFromLocalDate } from "./governanca-calendario";
import { displayTicker } from "./finacap-book";

export type GovernancaEvento = {
  id: number;
  ticker: string;
  companyName: string | null;
  semanaRef: string;
  janelaInicio: string | null;
  janelaFim: string | null;
  dataEvento: string | null;
  tipo: string | null;
  categoria: string | null;
  titulo: string;
  resumo: string | null;
  relevancia: string | null;
  destaque: boolean;
  destaqueOrdem: number | null;
  fonteNome: string | null;
  fonteUrl: string | null;
};

const TZ = "America/Sao_Paulo";

/** Segunda-feira da semana corrente (calendário de Brasília). */
export function mondayIso(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  const local = new Date(y, m - 1, d);
  const offset = (local.getDay() + 6) % 7;
  local.setDate(local.getDate() - offset);
  return isoFromLocalDate(local);
}

/** AZUL3 e AZUL4 são o mesmo papel na governança. */
export function relatedTickers(ticker: string): string[] {
  const raw = ticker.trim().toUpperCase();
  const shown = displayTicker(raw);
  const out = new Set([raw, shown]);
  if (shown === "AZUL3" || raw === "AZUL4") {
    out.add("AZUL3");
    out.add("AZUL4");
  }
  return [...out];
}

export function sortWeekEvents(events: GovernancaEvento[]): GovernancaEvento[] {
  return [...events].sort((a, b) => {
    const ad = a.dataEvento ?? "";
    const bd = b.dataEvento ?? "";
    if (ad !== bd) {
      if (!ad) return 1;
      if (!bd) return -1;
      return bd.localeCompare(ad);
    }
    if (a.destaque !== b.destaque) return a.destaque ? -1 : 1;
    const ao = a.destaqueOrdem ?? 999;
    const bo = b.destaqueOrdem ?? 999;
    if (ao !== bo) return ao - bo;
    return a.id - b.id;
  });
}

export const CATEGORIA_LABEL: Record<string, string> = {
  controle: "Controle",
  capital: "Capital",
  financiamento: "Financiamento",
  partes_relacionadas: "Partes relacionadas",
  outro: "Outro",
};
