/** Tipos e grade do calendário de resultados (BancoAsset.resultados). */

export type ResultadoEvent = {
  id: number;
  ticker: string;
  name: string | null;
  date: string;
};

export type CalCell = {
  iso: string;
  day: number;
  inMonth: boolean;
};

export const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export function blankToNull(v: string | null | undefined): string | null {
  const s = v?.trim();
  return s ? s : null;
}

/** yyyy-mm-dd a partir de Date local (sem UTC). */
export function isoFromLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayIso(now = new Date()): string {
  return isoFromLocalDate(now);
}

/** Aceita date ISO ou timestamptz; devolve só yyyy-mm-dd. */
export function toIsoDate(raw: string | null | undefined): string | null {
  const s = blankToNull(raw);
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? null;
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function monthTitle(year: number, month: number): string {
  const raw = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** 42 células, semana começa na segunda. */
export function monthGrid(year: number, month: number): CalCell[] {
  const first = new Date(year, month, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);
  const cells: CalCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    cells.push({
      iso: isoFromLocalDate(d),
      day: d.getDate(),
      inMonth: d.getMonth() === month,
    });
  }
  return cells;
}

export function groupEventsByDate(
  events: ResultadoEvent[]
): Map<string, ResultadoEvent[]> {
  const map = new Map<string, ResultadoEvent[]>();
  for (const e of events) {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  }
  return map;
}

/** Mês do próximo resultado; senão o último; senão hoje. */
export function initialMonth(
  events: ResultadoEvent[],
  today: string
): { year: number; month: number } {
  const pick =
    events.find((e) => e.date >= today) ?? events[events.length - 1];
  const iso = pick?.date ?? today;
  const [y, m] = iso.split("-").map(Number);
  return { year: y, month: m - 1 };
}

export function eventsInMonth(
  events: ResultadoEvent[],
  year: number,
  month: number
): ResultadoEvent[] {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
  return events.filter((e) => e.date.startsWith(prefix));
}

/** Primeiro dia com divulgação no mês (hoje, se houver; senão o próximo). */
export function firstEventIsoInMonth(
  events: ResultadoEvent[],
  year: number,
  month: number,
  today: string
): string | null {
  const list = eventsInMonth(events, year, month);
  if (list.length === 0) return null;
  if (list.some((e) => e.date === today)) return today;
  return list.find((e) => e.date >= today)?.date ?? list[0].date;
}
