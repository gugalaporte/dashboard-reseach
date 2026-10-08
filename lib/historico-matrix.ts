import type { MetricaRow } from "@/types/research";

/** Ano fiscal (2025, 2025A, 2025E). Não é data de relatório (2026-08-20). */
export function isYearPeriodo(periodo: string): boolean {
  return /^\d{4}[A-Za-z]{0,2}$/.test(periodo.trim());
}

function sortPeriodos(a: string, b: string): number {
  const yA = parseInt(a, 10);
  const yB = parseInt(b, 10);
  if (!Number.isNaN(yA) && !Number.isNaN(yB) && yA !== yB) return yA - yB;
  return a.localeCompare(b);
}

export type HistoricoMatrix = {
  periodos: string[];
  metricas: string[];
  byMetrica: Map<string, Map<string, MetricaRow>>;
};

/** Matriz métrica × ano, sem colunas de data e sem linhas/colunas vazias. */
export function buildHistoricoMatrix(hist: MetricaRow[]): HistoricoMatrix {
  const map = new Map<string, Map<string, MetricaRow>>();
  const pSet = new Set<string>();

  for (const r of hist) {
    if (r.metrica === "Target Price") continue;
    if (!r.metrica || !r.periodo || !isYearPeriodo(r.periodo)) continue;
    pSet.add(r.periodo);
    if (!map.has(r.metrica)) map.set(r.metrica, new Map());
    const per = map.get(r.metrica)!;
    const cur = per.get(r.periodo);
    if (!cur || (cur.data_relatorio ?? "") < (r.data_relatorio ?? "")) {
      per.set(r.periodo, r);
    }
  }

  const periodos = Array.from(pSet)
    .filter((p) =>
      [...map.values()].some((m) => {
        const v = m.get(p)?.valor;
        return v != null;
      })
    )
    .sort(sortPeriodos);

  const metricas = Array.from(map.keys())
    .filter((m) => periodos.some((p) => map.get(m)?.get(p)?.valor != null))
    .sort();

  return { periodos, metricas, byMetrica: map };
}
