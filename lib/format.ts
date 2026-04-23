// Utilitarios de formatacao em pt-BR para a tabela de research.
// Regra: null/undefined/NaN => "—" (em-dash).

const DASH = "—";

export function isNil(v: unknown): v is null | undefined {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

export function formatNumber(v: number | null | undefined, digits = 0): string {
  if (isNil(v)) return DASH;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);
}

export function formatPct(v: number | null | undefined, digits = 1): string {
  if (isNil(v)) return DASH;
  return `${formatNumber(v, digits)}%`;
}

export function formatMultiple(v: number | null | undefined, digits = 1): string {
  if (isNil(v)) return DASH;
  return `${formatNumber(v, digits)}x`;
}

// Valor monetario "puro" (Target Price, preco unitario).
export function formatMoney(
  v: number | null | undefined,
  ccy: string | null | undefined = "R$"
): string {
  if (isNil(v)) return DASH;
  const currency = ccy === "US$" ? "USD" : "BRL";
  const formatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
  // Mantem simbolo visual conforme unidade da base (R$ vs US$).
  return formatted;
}

// Grandezas financeiras em milhoes (unidade original = "R$mn" ou "US$mn").
export function formatMillions(
  v: number | null | undefined,
  unidade: string | null | undefined = "R$mn"
): string {
  if (isNil(v)) return DASH;
  const prefix = unidade && unidade.startsWith("US$") ? "US$" : "R$";
  return `${prefix} ${formatNumber(v, 0)} M`;
}

export function formatDate(v: string | null | undefined): string {
  if (!v) return DASH;
  try {
    return new Date(v).toLocaleDateString("pt-BR");
  } catch {
    return DASH;
  }
}
