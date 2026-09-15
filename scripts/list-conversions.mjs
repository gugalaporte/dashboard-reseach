import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function env(name) {
  const raw = readFileSync(".env.local", "utf8");
  const line = raw.split("\n").find((l) => l.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim();
}

function parseMovTradeDate(raw) {
  const m = String(raw).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
}

function num(v) {
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

const LISTED = /^(?:[3-8]|11|3[1-5])$/;
function isListed(product) {
  const p = String(product).trim().toUpperCase();
  if (p.includes("DIVIDEND") || p.includes("NAV_") || p.includes("SPLIT")) return false;
  const m = p.match(/^([A-Z]{4})(\d{1,2})$/);
  return Boolean(m && LISTED.test(m[2]));
}

function tickerFamily(ric) {
  const m = ric.trim().toUpperCase().match(/^([A-Z]{4})\d/);
  return m ? m[1] : ric.trim().toUpperCase();
}

function closePct(a, b, maxPct) {
  const m = Math.max(Math.abs(a), Math.abs(b));
  if (m <= 0) return false;
  return Math.abs(a - b) / m <= maxPct;
}

function pairKind(buy, sell) {
  const sameFamily = tickerFamily(buy.ric) === tickerFamily(sell.ric);
  if (sameFamily && closePct(buy.notional, sell.notional, 0.02)) return "classe";
  if (closePct(buy.qty, sell.qty, 0.002) && closePct(buy.avgPrice, sell.avgPrice, 0.002)) {
    return "ticker";
  }
  return null;
}

const fromIso = "2024-11-01";
const sb = createClient(env("SUPABASE_ASSET_URL"), env("SUPABASE_ASSET_SERVICE_KEY"));
const PAGE = 1000;
let cursor;
const rows = [];

while (true) {
  let q = sb
    .from("mov_ativo")
    .select("id,trade_date,product,amount,price,productclass,trading_desk")
    .eq("productclass", "Equity")
    .order("id", { ascending: false })
    .limit(PAGE);
  if (cursor != null) q = q.lt("id", cursor);
  const { data, error } = await q;
  if (error) throw error;
  const batch = data ?? [];
  if (batch.length === 0) break;
  for (const row of batch) {
    const iso = parseMovTradeDate(row.trade_date);
    if (!iso || iso < fromIso) continue;
    rows.push(row);
  }
  cursor = batch[batch.length - 1].id;
  if (batch.length < PAGE) break;
}

const map = new Map();
for (const row of rows) {
  if (row.productclass !== "Equity" || !isListed(row.product)) continue;
  const iso = parseMovTradeDate(row.trade_date);
  if (!iso) continue;
  const amount = num(row.amount);
  if (amount === 0) continue;
  const side = amount > 0 ? "buy" : "sell";
  const qty = Math.abs(amount);
  const px = num(row.price);
  if (px <= 0) continue;
  const desk = row.trading_desk?.trim() || "—";
  const key = `${iso}|${row.product}|${side}|${desk}`;
  const cur = map.get(key) ?? {
    ric: String(row.product).toUpperCase(),
    tradeDateIso: iso,
    tradingDesk: desk,
    side,
    qty: 0,
    notional: 0,
  };
  cur.qty += qty;
  cur.notional += qty * px;
  map.set(key, cur);
}
const executions = [...map.values()].map((x) => ({
  ...x,
  avgPrice: x.qty > 0 ? x.notional / x.qty : 0,
}));

const pairs = [];
const seen = new Set();
const byBucket = new Map();
for (const ex of executions) {
  const key = `${ex.tradeDateIso}|${ex.tradingDesk}`;
  const list = byBucket.get(key) ?? [];
  list.push(ex);
  byBucket.set(key, list);
}

for (const list of byBucket.values()) {
  const buys = list.filter((e) => e.side === "buy");
  const sells = list.filter((e) => e.side === "sell");
  for (const buy of buys) {
    for (const sell of sells) {
      const kind = pairKind(buy, sell);
      if (!kind) continue;
      const id = [buy.tradeDateIso, buy.tradingDesk, sell.ric, buy.ric].join("|");
      if (seen.has(id)) continue;
      seen.add(id);
      pairs.push({
        kind,
        date: buy.tradeDateIso,
        desk: buy.tradingDesk,
        from: sell.ric,
        to: buy.ric,
        qty: sell.qty,
        price: sell.avgPrice,
        notional: sell.notional + buy.notional,
      });
    }
  }
}

pairs.sort((a, b) => b.date.localeCompare(a.date) || a.from.localeCompare(b.from));
console.log(JSON.stringify(pairs, null, 2));
console.log("TOTAL_PAIRS", pairs.length);
console.log(
  "NOTIONAL_EXCLUIDO",
  pairs.reduce((s, p) => s + p.notional, 0)
);
