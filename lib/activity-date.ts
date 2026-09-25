/** Linha com datas de células (ResearchRow / LsegViewRow). */
export type ActivityRow = {
  fonte?: string;
  rating?: { date: string | null };
  price?: { date: string | null };
  target?: { date: string | null };
  pe?: { date: string | null };
  ev_ebitda?: { date: string | null };
  dy?: { date: string | null };
  roic?: { date: string | null };
  revenue?: { date: string | null };
  ebitda?: { date: string | null };
  net_debt?: { date: string | null };
  net_income?: { date: string | null };
  byMetricYear?: Partial<
    Record<string, Record<string, { date: string | null } | undefined>>
  >;
};

function todayIso(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Data mais recente em qualquer célula, inclusive estimativas por ano. */
export function latestActivityDate(row: ActivityRow): string | null {
  const dates: (string | null | undefined)[] = [
    row.rating?.date,
    row.price?.date,
    row.target?.date,
    row.pe?.date,
    row.ev_ebitda?.date,
    row.dy?.date,
    row.roic?.date,
    row.revenue?.date,
    row.ebitda?.date,
    row.net_debt?.date,
    row.net_income?.date,
  ];
  if (row.byMetricYear) {
    for (const years of Object.values(row.byMetricYear)) {
      if (!years) continue;
      for (const cell of Object.values(years)) {
        dates.push(cell?.date);
      }
    }
  }
  let max: string | null = null;
  for (const d of dates) {
    const iso = d?.slice(0, 10);
    if (iso && (!max || iso > max)) max = iso;
  }
  return max;
}

/** Maior data entre as linhas, sem datas futuras (lixo de extração). */
export function latestRowsDate(
  rows: ActivityRow[],
  opts?: { excludeFontes?: readonly string[] }
): string | null {
  const cap = todayIso();
  const skip = new Set(opts?.excludeFontes ?? []);
  let max: string | null = null;
  for (const r of rows) {
    if (r.fonte && skip.has(r.fonte)) continue;
    const d = latestActivityDate(r);
    if (!d || d > cap) continue;
    if (!max || d > max) max = d;
  }
  return max;
}
