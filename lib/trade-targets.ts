/** Tipos e parse das metas de compra/venda (aba Execução). */

export type TradeSide = "buy" | "sell";
export type TradeAmountType = "qty" | "value";

export type TradeTarget = {
  id: string;
  ticker: string;
  side: TradeSide;
  amountType: TradeAmountType;
  amount: number;
  createdAt: string;
  updatedAt: string;
};

export type TradeTargetInput = {
  ticker: string;
  side: TradeSide;
  amountType: TradeAmountType;
  amount: number;
};

export type TradeTargetRow = {
  id: string;
  ticker: string;
  side: string;
  amount_type: string;
  amount: number | string;
  created_at: string;
  updated_at: string;
};

const SIDES = new Set<TradeSide>(["buy", "sell"]);
const AMOUNT_TYPES = new Set<TradeAmountType>(["qty", "value"]);

export function parseTicker(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,8}$/.test(t)) return null;
  return t;
}

export function parseSide(v: unknown): TradeSide | null {
  return typeof v === "string" && SIDES.has(v as TradeSide)
    ? (v as TradeSide)
    : null;
}

export function parseAmountType(v: unknown): TradeAmountType | null {
  return typeof v === "string" && AMOUNT_TYPES.has(v as TradeAmountType)
    ? (v as TradeAmountType)
    : null;
}

/** Aceita 1500, 1.500,50 e 1500.50. */
export function parseAmount(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    return Number.isFinite(v) && v > 0 ? v : null;
  }
  const s = String(v).trim();
  if (!s) return null;
  let normalized: string;
  if (s.includes(",")) {
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    normalized = s.replace(/\./g, "");
  } else {
    normalized = s.replace(/,/g, "");
  }
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function parseTargetInput(body: unknown): TradeTargetInput | string {
  if (!body || typeof body !== "object") return "Body JSON inválido";
  const raw = body as Record<string, unknown>;
  const ticker = parseTicker(raw.ticker);
  if (!ticker) return "ticker inválido";
  const side = parseSide(raw.side);
  if (!side) return "side deve ser buy ou sell";
  const amountType = parseAmountType(raw.amountType);
  if (!amountType) return "amountType deve ser qty ou value";
  const amount = parseAmount(raw.amount);
  if (amount == null) return "amount deve ser um número maior que zero";
  return { ticker, side, amountType, amount };
}

export function rowToTarget(row: TradeTargetRow): TradeTarget {
  const amount = parseAmount(row.amount) ?? 0;
  return {
    id: String(row.id),
    ticker: String(row.ticker ?? "").trim().toUpperCase(),
    side: parseSide(row.side) ?? "buy",
    amountType: parseAmountType(row.amount_type) ?? "qty",
    amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
