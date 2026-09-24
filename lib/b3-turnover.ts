/** Série diária B3.TURNOVER (market_prices) → R$ para o gráfico. */

export const B3_TURNOVER_RIC = "B3.TURNOVER";
export const B3_TURNOVER_FROM = "2024-10-09";

export type B3TurnoverPoint = {
  tradeDateIso: string;
  notional: number;
};

/** Volume diário da B3 é ~R$ 10–40 bi. Escala se o banco gravou em bi ou mi. */
export function b3TurnoverToBrl(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value < 1_000) return value * 1e9;
  if (value < 1_000_000) return value * 1e6;
  return value;
}

export function toB3Point(tradeDate: string, value: unknown): B3TurnoverPoint | null {
  const iso = String(tradeDate ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const n = typeof value === "number" ? value : Number(value);
  const notional = b3TurnoverToBrl(n);
  if (notional <= 0) return null;
  return { tradeDateIso: iso, notional };
}
