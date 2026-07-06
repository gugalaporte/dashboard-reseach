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

function isoDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

const sb = createClient(env("SUPABASE_ASSET_URL"), env("SUPABASE_ASSET_SERVICE_KEY"));
const fromIso = isoDaysAgo(30);
console.log("fromIso 30d:", fromIso);

// BRAP4 rows
const { data: brap } = await sb
  .from("mov_ativo")
  .select("id,trade_date,product,amount,price,trading_desk,productclass")
  .eq("product", "BRAP4")
  .order("id", { ascending: false });
console.log("BRAP4 total:", brap?.length);
for (const r of brap ?? []) {
  const iso = parseMovTradeDate(r.trade_date);
  console.log(" ", r.id, r.trade_date, "->", iso, "in30d?", iso && iso >= fromIso, r.amount, r.price, r.trading_desk);
}

// Simulate loadEquityTrades pagination
const PAGE = 1000;
let offset = 0;
let foundBrap = 0;
let pages = 0;
let stoppedEarly = false;
const rows = [];

while (true) {
  const { data, error } = await sb
      .from("mov_ativo")
      .select(
        "id,trade_date,product,amount,price,productclass,book,trader,financialsettle,trading_desk"
      )
    .eq("productclass", "Equity")
    .order("id", { ascending: false })
    .range(offset, offset + PAGE - 1);
  const batch = data ?? [];
  if (batch.length === 0) break;
  pages++;
  let anyInRange = false;
  for (const row of batch) {
    const iso = parseMovTradeDate(row.trade_date);
    if (!iso || iso < fromIso) continue;
    rows.push(row);
    anyInRange = true;
    if (row.product === "BRAP4") foundBrap++;
  }
  if (!anyInRange) {
    stoppedEarly = true;
    break;
  }
  if (batch.length < PAGE) break;
  offset += PAGE;
}

console.log("pages scanned:", pages, "stoppedEarly:", stoppedEarly);
console.log("in-range rows:", rows.length, "BRAP4 in load:", foundBrap);
console.log("BRAP4 in DB in range:", (brap ?? []).filter((r) => {
  const iso = parseMovTradeDate(r.trade_date);
  return iso && iso >= fromIso;
}).length);

function num(v) {
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function isEquityTrade(row) {
  if (row.productclass !== "Equity") return false;
  const p = row.product.toUpperCase();
  if (p.includes("DIVIDEND") || p.includes("NAV_") || p.includes("SPLIT")) return false;
  return /^[A-Z]{4}\d{1,2}$/.test(p);
}
function aggregateExecutions(rawRows) {
  const map = new Map();
  for (const row of rawRows) {
    if (!isEquityTrade(row)) continue;
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
    const cur = map.get(key) ?? { ric: row.product.toUpperCase(), tradeDateIso: iso, tradingDesk: desk, side, qty: 0, notional: 0 };
    cur.qty += qty;
    cur.notional += qty * px;
    map.set(key, cur);
  }
  return [...map.values()];
}

function excludeStockConversions(executions) {
  const toRemove = new Set();
  const byBucket = new Map();
  const tickerFamily = (ric) => {
    const m = ric.trim().toUpperCase().match(/^([A-Z]{4})\d/);
    return m ? m[1] : ric.trim().toUpperCase();
  };
  const executionKey = (ex) => `${ex.tradeDateIso}|${ex.tradingDesk}|${ex.ric}|${ex.side}`;
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
        if (buy.ric === sell.ric) continue;
        if (tickerFamily(buy.ric) !== tickerFamily(sell.ric)) continue;
        const maxN = Math.max(buy.notional, sell.notional);
        if (maxN <= 0) continue;
        if (Math.abs(buy.notional - sell.notional) / maxN <= 0.02) {
          toRemove.add(executionKey(buy));
          toRemove.add(executionKey(sell));
        }
      }
    }
  }
  return executions.filter((ex) => !toRemove.has(executionKey(ex)));
}

const agg = aggregateExecutions(rows);
const afterExcl = excludeStockConversions(agg);
console.log("aggregated total:", agg.length);
console.log("after exclude:", afterExcl.length);
console.log("BRAP4 aggregated:", agg.filter((e) => e.ric === "BRAP4").length);
console.log("BRAP4 after exclude:", afterExcl.filter((e) => e.ric === "BRAP4").length);
const dates = [...new Set(afterExcl.map((e) => e.tradeDateIso))].sort();
console.log("dates after exclude:", dates);
console.log("all rics:", [...new Set(afterExcl.map((e) => e.ric))].sort().join(", "));

// Page 1 batch analysis (same query as API)
const cols =
  "id,trade_date,product,amount,price,productclass,book,trader,financialsettle,trading_desk";
const { data: page1 } = await sb
  .from("mov_ativo")
  .select(cols)
  .eq("productclass", "Equity")
  .order("id", { ascending: false })
  .range(0, 999);
const maxId = (page1 ?? []).reduce((m, r) => (r.id > m ? r.id : m), 0);
const inRangeP1 = (page1 ?? []).filter((r) => {
  const iso = parseMovTradeDate(r.trade_date);
  return iso && iso >= fromIso;
});
console.log("page1 len", page1?.length, "maxId", maxId);
console.log("page1 inRange", inRangeP1.length, "BRAP4", inRangeP1.filter((r) => r.product === "BRAP4").length);
console.log(
  "page1 june24+",
  (page1 ?? []).filter((r) => {
    const iso = parseMovTradeDate(r.trade_date);
    return iso && iso >= "2026-06-24";
  }).length
);
