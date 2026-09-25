// Moeda de preço/target. O pipeline grava unidade suja (US,, R,).

export type MoneyCcy = "R$" | "US$" | "MX$" | "CLP$";

export function defaultCcyForTicker(ticker: string): "R$" | "US$" {
  const t = (ticker ?? "").trim().toUpperCase();
  // Tickers sem número no final (VALE, INTR) são ADR / listados em US$.
  return /\d$/.test(t) ? "R$" : "US$";
}

export function normalizeCcy(unidade: string | null | undefined): MoneyCcy | null {
  if (!unidade) return null;
  const u = unidade.trim().toUpperCase().replace(/[,.\s]/g, "");
  if (!u) return null;
  if (/^(US\$|USD|US|U\$|DOLAR|DÓLAR)$/.test(u)) return "US$";
  if (/^(R\$|BRL|R|REAL|REAIS)$/.test(u)) return "R$";
  if (/^(MX\$|MXN|MX)$/.test(u)) return "MX$";
  if (/^(CLP\$|CLP)$/.test(u)) return "CLP$";
  return null;
}

export function sameCcy(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  const left = normalizeCcy(a);
  const right = normalizeCcy(b);
  return left != null && right != null && left === right;
}

export function resolveCcy(
  unidade: string | null | undefined,
  ticker?: string | null
): MoneyCcy {
  return normalizeCcy(unidade) ?? defaultCcyForTicker(ticker ?? "");
}

export function isoCurrency(ccy: string | null | undefined): string {
  const n = normalizeCcy(ccy);
  if (n === "US$") return "USD";
  if (n === "MX$") return "MXN";
  if (n === "CLP$") return "CLP";
  return "BRL";
}

export function moneyPrefix(ccy: string | null | undefined): string {
  return normalizeCcy(ccy) ?? "R$";
}

/** Só calcula variação quando prev e atual estão na mesma moeda. */
export function tpChangePct(
  prev: number | null | undefined,
  curr: number | null | undefined,
  prevCcy: string | null | undefined,
  currCcy: string | null | undefined
): number | null {
  if (prev == null || curr == null || prev === 0) return null;
  if (!Number.isFinite(prev) || !Number.isFinite(curr)) return null;
  if (!sameCcy(prevCcy, currCcy)) return null;
  return ((curr - prev) / prev) * 100;
}
