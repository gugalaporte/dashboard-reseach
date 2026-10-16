import "server-only";

import { getResearchSupabase } from "./supabase-research";
import { displayTicker } from "./finacap-book";
import { resolveRicForTicker } from "./lseg-series";
import {
  avg,
  buildMultipleBands,
  estimateIntrinsic,
  finite,
  median,
} from "./bottom-up-value";
import { buildAnnualPoints, buildFiscalSeries } from "./bottom-up-series";
import type { BottomUpPayload, SeriesPoint } from "./bottom-up-types";

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
  "roic_calc",
  "ebitda_margin",
  "net_margin",
  "net_debt_ebitda",
  "free_cash_flow",
  "pe_ratio",
  "pb_ratio",
  "ev_ebitda",
  "ebitda",
  "net_income",
  "total_equity",
  "enterprise_value",
  "net_debt",
  "total_debt",
  "market_cap",
  "market_cap_currency",
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
        "period_year,period_label,period_type,as_of_date,revenue,ebitda,net_income,free_cash_flow,total_debt"
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
      roic: num((row as { roic?: unknown }).roic) ?? num((row as { roic_calc?: unknown }).roic_calc),
      ebitdaMargin: num((row as { ebitda_margin?: unknown }).ebitda_margin),
      netMargin: num((row as { net_margin?: unknown }).net_margin),
      netDebtEbitda: num((row as { net_debt_ebitda?: unknown }).net_debt_ebitda),
      freeCashFlow: num((row as { free_cash_flow?: unknown }).free_cash_flow),
      peRatio: num((row as { pe_ratio?: unknown }).pe_ratio),
      pbRatio: num((row as { pb_ratio?: unknown }).pb_ratio),
      evEbitda: num((row as { ev_ebitda?: unknown }).ev_ebitda),
      price: close ?? last,
    };
    byMonth.set(date.slice(0, 7), point);
  }
  const series = [...byMonth.values()];

  const histRows = histRes.data ?? [];
  const annual = buildAnnualPoints(histRows);
  const fiscal = buildFiscalSeries(histRows);

  // Pares do mesmo setor (snapshot mais recente de cada RIC)
  let peerPes: number[] = [];
  let peerEvs: number[] = [];
  let peerPbs: number[] = [];
  let peerTickers: string[] = [];

  if (sector) {
    const { data: peers, error: pErr } = await db
      .from("companies")
      .select("ric,ticker")
      .eq("sector", sector);
    if (pErr) throw pErr;
    const tickerByRic = new Map<string, string>();
    for (const p of peers ?? []) {
      const r = String((p as { ric?: string }).ric ?? "");
      if (!r || r === ric) continue;
      const raw =
        String((p as { ticker?: string }).ticker ?? "").trim() ||
        r.split(".")[0] ||
        r;
      tickerByRic.set(r, displayTicker(raw));
    }
    const rics = [...tickerByRic.keys()].slice(0, 80);

    if (rics.length > 0) {
      const { data: peerSnaps, error: psErr } = await db
        .from("daily_snapshot")
        .select("ric,as_of_date,pe_ratio,pb_ratio,ev_ebitda")
        .in("ric", rics)
        .order("as_of_date", { ascending: false });
      if (psErr) throw psErr;

      const latest = new Map<
        string,
        { pe: number | null; ev: number | null; pb: number | null }
      >();
      for (const row of peerSnaps ?? []) {
        const r = String((row as { ric?: string }).ric ?? "");
        if (!r || latest.has(r)) continue;
        latest.set(r, {
          pe: num((row as { pe_ratio?: unknown }).pe_ratio),
          ev: num((row as { ev_ebitda?: unknown }).ev_ebitda),
          pb: num((row as { pb_ratio?: unknown }).pb_ratio),
        });
      }
      peerTickers = [...latest.keys()]
        .map((r) => tickerByRic.get(r) ?? displayTicker(r.split(".")[0] ?? r))
        .sort((a, b) => a.localeCompare(b, "pt"));
      peerPes = finite([...latest.values()].map((v) => v.pe));
      peerEvs = finite([...latest.values()].map((v) => v.ev));
      peerPbs = finite([...latest.values()].map((v) => v.pb));
    }
  }

  const latestSnap = (snapRes.data ?? []).at(-1) as
    | Record<string, unknown>
    | undefined;
  const currentPe = num(latestSnap?.pe_ratio);
  const currentEv = num(latestSnap?.ev_ebitda);
  const price = num(latestSnap?.price_close) ?? num(latestSnap?.last_price);
  const ebitda = num(latestSnap?.ebitda);
  const netIncome = num(latestSnap?.net_income);
  const totalEquity = num(latestSnap?.total_equity);
  const enterpriseValue = num(latestSnap?.enterprise_value);
  const netDebt = num(latestSnap?.net_debt);
  const totalDebt = num(latestSnap?.total_debt);
  const marketCap = num(latestSnap?.market_cap);
  const marketCapCurrency =
    typeof latestSnap?.market_cap_currency === "string"
      ? latestSnap.market_cap_currency
      : null;

  const bands = buildMultipleBands(
    series,
    currentPe,
    currentEv,
    peerPes,
    peerEvs
  );
  const pbValues = finite(series.map((p) => p.pbRatio ?? null)).filter(
    (v) => v > 0
  );
  const peerPbPos = peerPbs.filter((v) => v > 0);
  const evBand = bands.find((b) => b.key === "evEbitda");
  const peBand = bands.find((b) => b.key === "pe");

  const intrinsic = estimateIntrinsic({
    price,
    pe: currentPe,
    evEbitda: currentEv,
    ebitda,
    netIncome,
    totalEquity,
    enterpriseValue,
    netDebt,
    totalDebt,
    marketCap,
    marketCapCurrency,
    histAvgEvEbitda: evBand?.avg ?? null,
    peerMedianEvEbitda: evBand?.peerMedian ?? null,
    histAvgPe: peBand?.avg ?? null,
    peerMedianPe: peBand?.peerMedian ?? null,
    histAvgPb: avg(pbValues),
    peerMedianPb: median(peerPbPos),
  });

  return {
    ticker: t,
    ric,
    name,
    sector,
    series,
    annual,
    fiscal,
    bands,
    intrinsic,
    peerCount: peerTickers.length,
    peers: peerTickers,
  };
}
