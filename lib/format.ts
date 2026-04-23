// Utilitarios de formatacao em pt-BR.
// Regra: null/undefined/NaN => en-dash "–".

const DASH = "–"; // en-dash (mais fino que em-dash)
const PT = "pt-BR";

export type Format = "money" | "millions" | "mult" | "pct";

export function isNil(v: unknown): v is null | undefined {
  return v === null || v === undefined || (typeof v === "number" && Number.isNaN(v));
}

export function formatNumber(v: number | null | undefined, digits = 0): string {
  if (isNil(v)) return DASH;
  return new Intl.NumberFormat(PT, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(v);
}

// Formatador unificado usado pelo MetricCell.
export function formatValue(v: number, f: Format, ccy?: string | null): string {
  if (f === "money") {
    const currency = ccy === "US$" ? "USD" : "BRL";
    return new Intl.NumberFormat(PT, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(v);
  }
  if (f === "millions") {
    const n = new Intl.NumberFormat(PT, { maximumFractionDigits: 0 }).format(v);
    return `R$ ${n} M`;
  }
  if (f === "pct") {
    return `${v.toLocaleString(PT, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })}%`;
  }
  // default: 'mult'
  return `${v.toLocaleString(PT, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}x`;
}

// Data curta no formato dd/mm/aaaa (usada nos subtextos das celulas).
export function formatDateShort(d: string): string {
  return new Intl.DateTimeFormat(PT, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));
}

// Data longa ex.: "22 abr 2026" (sem ponto no mes abreviado).
// Usada no header do app.
export function formatDateLong(d: string | null | undefined): string {
  if (!d) return DASH;
  const s = new Intl.DateTimeFormat(PT, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
  return s.replace(/\./g, "");
}

// dd/mm/aaaa (compat com codigo existente).
export function formatDate(v: string | null | undefined): string {
  if (!v) return DASH;
  try {
    return new Date(v).toLocaleDateString(PT);
  } catch {
    return DASH;
  }
}
