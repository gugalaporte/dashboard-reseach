import { displayTicker } from "./finacap-book";

/** Raiz B3: AZUL3 / AZUL4 / AZUL11 → AZUL. */
export function issuerKey(ticker: string): string {
  const t = displayTicker(ticker).trim().toUpperCase();
  const m = t.match(/^([A-Z]{4})/);
  return m?.[1] ?? t;
}

const PREFERRED_CLASS: Record<string, number> = { "3": 0, "4": 1, "11": 2 };

function classRank(ticker: string): number {
  const t = displayTicker(ticker).trim().toUpperCase();
  const m = t.match(/^[A-Z]{4}(\d+)/);
  const cls = m?.[1] ?? "999";
  return PREFERRED_CLASS[cls] ?? 10 + Number(cls || 999);
}

type PortfolioCard = {
  empresa: string;
  name: string | null;
  sector: string | null;
};

/** Um card por empresa: escolhe o ticker com mais dados (setor/nome). */
export function pickPortfolioCompanies<T extends PortfolioCard>(rows: T[]): T[] {
  const byIssuer = new Map<string, T[]>();
  for (const row of rows) {
    const key = issuerKey(row.empresa);
    const list = byIssuer.get(key) ?? [];
    list.push(row);
    byIssuer.set(key, list);
  }

  const picked: T[] = [];
  for (const list of byIssuer.values()) {
    list.sort((a, b) => {
      const as = a.sector ? 0 : 1;
      const bs = b.sector ? 0 : 1;
      if (as !== bs) return as - bs;
      const an = a.name ? 0 : 1;
      const bn = b.name ? 0 : 1;
      if (an !== bn) return an - bn;
      const ac = classRank(a.empresa);
      const bc = classRank(b.empresa);
      if (ac !== bc) return ac - bc;
      return a.empresa.localeCompare(b.empresa);
    });
    picked.push(list[0]!);
  }

  return picked.sort((a, b) => a.empresa.localeCompare(b.empresa));
}
