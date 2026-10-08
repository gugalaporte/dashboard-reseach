import { latestActivityDate } from "./activity-date";
import { displayTicker } from "./finacap-book";
import { issuerKey, pickPortfolioCompanies } from "./governanca-portfolio";

type ConsensoRow = {
  empresa: string;
  fonte: string;
  rating?: { date: string | null };
  price?: { date: string | null };
  target?: { date: string | null };
};

export function empresaHref(ticker: string): string {
  const t = displayTicker(ticker).trim().toUpperCase();
  return `/empresa/${encodeURIComponent(t)}`;
}

export function pickEmpresaRow<
  T extends { empresa: string; name: string | null; sector: string | null },
>(rows: T[], ticker: string): T | null {
  const t = displayTicker(ticker).trim().toUpperCase();
  const sibs = rows.filter((r) => issuerKey(r.empresa) === issuerKey(t));
  if (sibs.length === 0) return null;
  return pickPortfolioCompanies(sibs)[0] ?? null;
}

export function siblingTickers(
  ids: string[],
  ticker: string
): string[] {
  const key = issuerKey(ticker);
  const set = new Set<string>();
  set.add(displayTicker(ticker).trim().toUpperCase());
  for (const raw of ids) {
    const id = displayTicker(raw).trim().toUpperCase();
    if (id && issuerKey(id) === key) set.add(id);
  }
  return [...set].sort();
}

export const EMPRESA_TABS = [
  "visao",
  "research",
  "screening",
  "tese",
  "governanca",
] as const;

export type EmpresaTab = (typeof EMPRESA_TABS)[number];

export function parseEmpresaTab(raw: string | null | undefined): EmpresaTab | null {
  if (!raw) return null;
  return EMPRESA_TABS.includes(raw as EmpresaTab) ? (raw as EmpresaTab) : null;
}

/** Uma linha por casa: a de data mais recente. Empate fica com o ticker da página. */
export function latestConsensoByFonte<T extends ConsensoRow>(
  rows: T[],
  ticker?: string
): T[] {
  const t = ticker ? displayTicker(ticker).trim().toUpperCase() : "";
  const best = new Map<string, T>();
  for (const row of rows) {
    const cur = best.get(row.fonte);
    if (!cur) {
      best.set(row.fonte, row);
      continue;
    }
    const dNew = latestActivityDate(row) ?? "";
    const dCur = latestActivityDate(cur) ?? "";
    if (dNew > dCur) {
      best.set(row.fonte, row);
      continue;
    }
    if (
      dNew === dCur &&
      t &&
      displayTicker(row.empresa) === t &&
      displayTicker(cur.empresa) !== t
    ) {
      best.set(row.fonte, row);
    }
  }
  return [...best.values()].sort((a, b) => a.fonte.localeCompare(b.fonte));
}
