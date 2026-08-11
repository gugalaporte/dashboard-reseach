import "server-only";

import { getResearchSupabase } from "./supabase-research";
import { resolveRicForTicker } from "./lseg-series";
import {
  buildMultipleBands,
  estimateIntrinsic,
  finite,
} from "./bottom-up-value";
import type {
  AnnualPoint,
  BottomUpPayload,
  SeriesPoint,
} from "./bottom-up-types";

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const SNAP_SELECT = [
  "as_of_date",
  "last_price",
  "price_close",
  "roe",
  "roic",
  "ebitda_margin",
  "net_margin",
  "net_debt_ebitda",
  "free_cash_flow",
  "pe_ratio",
  "ev_ebitda",
  "ebitda",
  "net_debt",
  "market_cap",
].join(",");

/** Carrega payload Bottom-up para um ticker. */
export async function loadBottomUp(ticker: string): Promise<BottomUpPayload> {
  const t = ticker.trim().toUpperCase();
  if (!t) throw new Error("Ticker obrigatório");

  const ric = await resolveRicForTicker(t);
  const db = getResearchSupabase();

  const [coRes, snapRes, histRes] = await Promise.all([
    db
      .from("companies")
      .select("ticker,ric,sector,name")
      .eq("ric", ric)
      .maybeSingle(),
    db
      .from("daily_snapshot")
      .select(SNAP_SELECT)
      .eq("ric", ric)
      .order("as_of_date", { ascending: true }),
    db
      .from("historical_series")
      .select(
        "period_year,period_label,revenue,ebitda,net_income,free_cash_flow,total_debt"
      )
      .eq("ric", ric)
      .order("period_year", { ascending: true }),
  ]);

  if (coRes.error) throw coRes.error;
  if (snapRes.error) throw snapRes.error;
  if (histRes.error) throw histRes.error;

  const sector = (coRes.data?.sector as string | null) ?? null;
  const name = (coRes.data?.name as string | null) ?? null;

  // Último ponto de cada mês (série diária cheia deixa o gráfico pesado).
  const byMonth = new Map<string, SeriesPoint>();
  for (const row of snapRes.data ?? []) {
    const date = String((row as { as_of_date?: string }).as_of_date ?? "").slice(
      0,
      10
    );
    if (!date) continue;
    const last = num((row as { last_price?: unknown }).last_price);
    const close = num((row as { price_close?: unknown }).price_close);
    const point: SeriesPoint = {
      date,
      roe: num((row as { roe?: unknown }).roe),
      roic: num((row as { roic?: unknown }).roic),
      ebitdaMargin: num((row as { ebitda_margin?: unknown }).ebitda_margin),
      netMargin: num((row as { net_margin?: unknown }).net_margin),
      netDebtEbitda: num((row as { net_debt_ebitda?: unknown }).net_debt_ebitda),
      freeCashFlow: num((row as { free_cash_flow?: unknown }).free_cash_flow),
      peRatio: num((row as { pe_ratio?: unknown }).pe_ratio),
      evEbitda: num((row as { ev_ebitda?: unknown }).ev_ebitda),
      price: close ?? last,
    };
    byMonth.set(date.slice(0, 7), point);
  }
  const series = [...byMonth.values()];

  const annual: AnnualPoint[] = [];
  for (const row of histRes.data ?? []) {
    const year = num((row as { period_year?: unknown }).period_year);
    if (year == null) continue;
    annual.push({
      year,
      label:
        String((row as { period_label?: string }).period_label ?? year) ||
        String(year),
      revenue: num((row as { revenue?: unknown }).revenue),
      ebitda: num((row as { ebitda?: unknown }).ebitda),
      netIncome: num((row as { net_income?: unknown }).net_income),
      freeCashFlow: num((row as { free_cash_flow?: unknown }).free_cash_flow),
      totalDebt: num((row as { total_debt?: unknown }).total_debt),
    });
  }

  // Pares do mesmo setor (snapshot mais recente de cada RIC)
  let peerPes: number[] = [];
  let peerEvs: number[] = [];
  let peerCount = 0;

  if (sector) {
    const { data: peers, error: pErr } = await db
      .from("companies")
      .select("ric")
      .eq("sector", sector);
    if (pErr) throw pErr;
    const rics = (peers ?? [])
      .map((p) => String((p as { ric?: string }).ric ?? ""))
      .filter((r) => r && r !== ric)
      .slice(0, 80);

    if (rics.length > 0) {
      const { data: peerSnaps, error: psErr } = await db
        .from("daily_snapshot")
        .select("ric,as_of_date,pe_ratio,ev_ebitda")
        .in("ric", rics)
        .order("as_of_date", { ascending: false });
      if (psErr) throw psErr;

      const latest = new Map<string, { pe: number | null; ev: number | null }>();
      for (const row of peerSnaps ?? []) {
        const r = String((row as { ric?: string }).ric ?? "");
        if (!r || latest.has(r)) continue;
        latest.set(r, {
          pe: num((row as { pe_ratio?: unknown }).pe_ratio),
          ev: num((row as { ev_ebitda?: unknown }).ev_ebitda),
        });
      }
      peerCount = latest.size;
      peerPes = finite([...latest.values()].map((v) => v.pe));
      peerEvs = finite([...latest.values()].map((v) => v.ev));
    }
  }

  const latestSnap = (snapRes.data ?? []).at(-1) as
    | Record<string, unknown>
    | undefined;
  const currentPe = num(latestSnap?.pe_ratio);
  const currentEv = num(latestSnap?.ev_ebitda);
  const price = num(latestSnap?.price_close) ?? num(latestSnap?.last_price);
  const ebitda = num(latestSnap?.ebitda);
  const netDebt = num(latestSnap?.net_debt);
  const marketCap = num(latestSnap?.market_cap);

  const bands = buildMultipleBands(
    series,
    currentPe,
    currentEv,
    peerPes,
    peerEvs
  );
  const evBand = bands.find((b) => b.key === "evEbitda");
  const peBand = bands.find((b) => b.key === "pe");

  const intrinsic = estimateIntrinsic({
    price,
    pe: currentPe,
    evEbitda: currentEv,
    ebitda,
    netDebt,
    marketCap,
    histAvgEvEbitda: evBand?.avg ?? null,
    peerMedianEvEbitda: evBand?.peerMedian ?? null,
    histAvgPe: peBand?.avg ?? null,
  });

  return {
    ticker: t,
    ric,
    name,
    sector,
    series,
    annual,
    bands,
    intrinsic,
    peerCount,
  };
}
