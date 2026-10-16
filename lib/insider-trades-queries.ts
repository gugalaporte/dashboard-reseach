import "server-only";

import { getResearchSupabase } from "./supabase-research";
import {
  isInsiderTrade,
  keepLatestVersion,
  monthKey,
  monthRange,
  portfolioIssuers,
  tickerByCvmName,
  type InsiderPayload,
  type InsiderTrade,
} from "./insider-trades";

const PAGE = 1000;

const COLS =
  "id,cnpj_companhia,nome_companhia,data_referencia,versao,tipo_cargo,tipo_movimentacao,caracteristica_valor_mobiliario,quantidade,preco_unitario,volume";

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function text(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t || null;
}

function isoDate(v: unknown): string {
  return String(v ?? "").slice(0, 10);
}

async function portfolioTickers(): Promise<string[]> {
  const db = getResearchSupabase();
  const { data, error } = await db
    .from("companies")
    .select("ticker")
    .eq("in_portfolio", true);
  if (error) throw error;
  return (data ?? [])
    .map((row) => String((row as { ticker?: string }).ticker ?? "").trim())
    .filter(Boolean);
}

async function pageAll(
  names: string[],
  range: { start: string; end: string } | null,
  columns: string
): Promise<Record<string, unknown>[]> {
  const db = getResearchSupabase();
  const out: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    let q = db.from("vlmo_movimentacoes").select(columns).in("nome_companhia", names);
    if (range) {
      q = q.gte("data_referencia", range.start).lt("data_referencia", range.end);
    }
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Record<string, unknown>[];
    out.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

/** Compras e vendas da carteira no mês, na versão mais recente de cada data. */
export async function loadInsiderTrades(month?: string | null): Promise<InsiderPayload> {
  const issuers = portfolioIssuers(await portfolioTickers());
  const names = issuers.map((i) => i.cvmName);
  if (names.length === 0) return { month: null, months: [], rows: [] };

  const dateRows = await pageAll(names, null, "data_referencia,tipo_movimentacao");
  const months = [
    ...new Set(
      dateRows
        .filter((row) => isInsiderTrade(text(row.tipo_movimentacao)))
        .map((row) => monthKey(isoDate(row.data_referencia)))
        .filter((key) => key.length === 7)
    ),
  ].sort((a, b) => b.localeCompare(a));

  const asked = (month ?? "").trim().slice(0, 7);
  const selected = months.includes(asked) ? asked : (months[0] ?? null);
  const range = selected ? monthRange(selected) : null;
  if (!selected || !range) return { month: null, months, rows: [] };

  const byName = tickerByCvmName(issuers);
  const raw = await pageAll(names, range, COLS);
  const parsed = raw
    .map((row) => {
      const company = text(row.nome_companhia) ?? "";
      const movimentacao = text(row.tipo_movimentacao) ?? "";
      if (!isInsiderTrade(movimentacao)) return null;
      const trade: InsiderTrade & { cnpj: string } = {
        id: num(row.id) ?? 0,
        cnpj: text(row.cnpj_companhia) ?? company,
        ticker: byName.get(company) ?? "",
        company,
        date: isoDate(row.data_referencia),
        versao: num(row.versao) ?? 0,
        cargo: text(row.tipo_cargo),
        movimentacao,
        valorMobiliario: text(row.caracteristica_valor_mobiliario),
        quantidade: num(row.quantidade),
        preco: num(row.preco_unitario),
        volume: num(row.volume),
      };
      return trade;
    })
    .filter((row): row is InsiderTrade & { cnpj: string } => row != null && Boolean(row.ticker));

  const rows = keepLatestVersion(parsed)
    .map(({ cnpj: _cnpj, ...trade }) => trade)
    .sort((a, b) => a.ticker.localeCompare(b.ticker) || a.movimentacao.localeCompare(b.movimentacao));

  return { month: selected, months, rows };
}
