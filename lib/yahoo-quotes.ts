import "server-only";
import YahooFinance from "yahoo-finance2";

// v3.x exige instancia (diferente da v2 que tinha singleton no default).
// suppressNotices evita o aviso de survey do mantenedor a cada boot.
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Cotacoes Yahoo (B3: delayed ~15min). Usamos fechamento do ultimo pregão
// completo em horário de pregão; fora do pregão, o preço regular já reflete
// o fechamento do dia. Rodamos server-side (cookie/crumb + sem CORS no browser).

export type LiveQuote = {
  ticker: string; // ex.: "AXIA3"
  price: number;
  currency: string; // geralmente "BRL"
  asOf: string; // ISO (timestamp de referencia do quote Yahoo)
  /** true = preço é regularMarketPreviousClose (pregão anterior ainda aberto). */
  isPreviousSessionClose?: boolean;
};

// TTL curto: refresh periodico sem bombardear Yahoo.
const CACHE_TTL_MS = 60_000;

type CacheEntry = { quote: LiveQuote; expires: number };
const cache = new Map<string, CacheEntry>();

// Converte ticker brasileiro puro (AXIA3) no simbolo Yahoo (AXIA3.SA).
// Ja tem ponto? respeita o que veio.
function toYahooSymbol(ticker: string): string {
  return ticker.includes(".") ? ticker : `${ticker}.SA`;
}

// Remove sufixo .SA para casar de volta com o ticker usado no banco.
function fromYahooSymbol(sym: string): string {
  return sym.replace(/\.SA$/, "");
}

// Busca cotacoes em batch. Nunca lanca; tickers com falha ficam fora do Map.
export async function getLiveQuotes(
  tickers: string[]
): Promise<Map<string, LiveQuote>> {
  const result = new Map<string, LiveQuote>();
  if (tickers.length === 0) return result;

  const now = Date.now();
  const needFetch: string[] = [];

  // 1) serve cache quente primeiro
  for (const t of tickers) {
    const hit = cache.get(t);
    if (hit && hit.expires > now) {
      result.set(t, hit.quote);
    } else {
      needFetch.push(t);
    }
  }

  if (needFetch.length === 0) return result;

  const symbols = needFetch.map(toYahooSymbol);

  // Shape minimo que consumimos do retorno de yahoo-finance2.quote().
  type RawQuote = {
    symbol?: unknown;
    regularMarketPrice?: unknown;
    regularMarketPreviousClose?: unknown;
    regularMarketTime?: unknown;
    marketState?: unknown;
    currency?: unknown;
  };

  function pickSessionClose(q: RawQuote, nowMs: number): Omit<LiveQuote, "ticker" | "currency"> | null {
    const state = String(q.marketState ?? "").toUpperCase();
    const cur =
      typeof q.regularMarketPrice === "number" && Number.isFinite(q.regularMarketPrice)
        ? q.regularMarketPrice
        : null;
    const prev =
      typeof q.regularMarketPreviousClose === "number" &&
      Number.isFinite(q.regularMarketPreviousClose)
        ? q.regularMarketPreviousClose
        : null;

    const rmt = q.regularMarketTime;
    const asOfMs =
      rmt instanceof Date
        ? rmt.getTime()
        : typeof rmt === "number"
          ? rmt * 1000
          : nowMs;

    // Em pregão (ou pré): o "ultimo fechamento" publicado é o do pregão anterior.
    const intraday =
      state === "REGULAR" || state === "PRE" || state === "PREPRE" || state === "OPEN";

    if (intraday && prev != null) {
      return {
        price: prev,
        asOf: new Date(asOfMs).toISOString(),
        isPreviousSessionClose: true,
      };
    }
    if (cur != null) {
      return {
        price: cur,
        asOf: new Date(asOfMs).toISOString(),
        isPreviousSessionClose: false,
      };
    }
    if (prev != null) {
      return {
        price: prev,
        asOf: new Date(asOfMs).toISOString(),
        isPreviousSessionClose: false,
      };
    }
    return null;
  }

  try {
    // quote() tem overloads complicados que fazem o TS narrowar p/ never;
    // convertemos para um shape minimo e seguimos com guardas explicitas.
    const quotes = (await yahooFinance.quote(symbols)) as unknown;
    const list: RawQuote[] = Array.isArray(quotes)
      ? (quotes as RawQuote[])
      : [quotes as RawQuote];

    for (const q of list) {
      if (!q || typeof q.symbol !== "string") continue;
      const ticker = fromYahooSymbol(q.symbol);
      const picked = pickSessionClose(q, now);
      if (!picked) continue;
      const live: LiveQuote = {
        ticker,
        price: picked.price,
        currency: typeof q.currency === "string" ? q.currency : "BRL",
        asOf: picked.asOf,
        isPreviousSessionClose: picked.isPreviousSessionClose,
      };
      result.set(ticker, live);
      cache.set(ticker, { quote: live, expires: now + CACHE_TTL_MS });
    }
  } catch (err) {
    // Nao derruba o dashboard: apenas registra. Fallback p/ banco ocorre no client.
    console.error("[yahoo-quotes] batch falhou:", err);
  }

  return result;
}

// --- Fechamento diário Yahoo na (ou antes da) data do relatório (EPS quando guide sem preço) ---

const HIST_CACHE = new Map<string, { price: number; expires: number }>();
const HIST_TTL_MS = 6 * 60 * 60 * 1000; // 6h: dados históricos estáveis

function candleDayIsoUtc(date: unknown): string {
  const d = date instanceof Date ? date : new Date(String(date));
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Último pregão com data <= reportIso (yyyy-mm-dd), usando close do candle. */
function pickCloseOnOrBefore(
  quotes: Array<{ date?: unknown; close?: unknown; adjclose?: unknown }>,
  reportIso: string
): number | null {
  let bestDay = "";
  let bestClose: number | null = null;
  for (const q of quotes) {
    const day = candleDayIsoUtc(q.date);
    if (!day || day > reportIso) continue;
    const c =
      typeof q.close === "number" && Number.isFinite(q.close)
        ? q.close
        : typeof q.adjclose === "number" && Number.isFinite(q.adjclose)
          ? q.adjclose
          : null;
    if (c == null) continue;
    if (day >= bestDay) {
      bestDay = day;
      bestClose = c;
    }
  }
  return bestClose;
}

export async function getCloseOnOrBeforeReportDate(
  ticker: string,
  reportIsoDate: string
): Promise<number | null> {
  const key = `${ticker}|${reportIsoDate}`;
  const hit = HIST_CACHE.get(key);
  if (hit && hit.expires > Date.now()) return hit.price;

  const sym = toYahooSymbol(ticker);
  const end = new Date(reportIsoDate + "T12:00:00.000Z");
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 45);

  try {
    const chart = (await yahooFinance.chart(sym, {
      period1: start,
      period2: new Date(end.getTime() + 5 * 86400000),
      interval: "1d",
    })) as {
      quotes?: Array<{ date?: unknown; close?: unknown; adjclose?: unknown }>;
    };
    const quotes = chart.quotes ?? [];
    const price = pickCloseOnOrBefore(quotes, reportIsoDate);
    if (price != null) {
      HIST_CACHE.set(key, { price, expires: Date.now() + HIST_TTL_MS });
    }
    return price;
  } catch (err) {
    console.error("[yahoo-quotes] chart report-date", ticker, reportIsoDate, err);
    return null;
  }
}

export async function batchGetClosesForReportDates(
  pairs: { ticker: string; reportDate: string }[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const uniq: { ticker: string; reportDate: string }[] = [];
  const seen = new Set<string>();
  for (const p of pairs) {
    const k = `${p.ticker}|${p.reportDate}`;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(p);
  }
  const BATCH = 5;
  for (let i = 0; i < uniq.length; i += BATCH) {
    const slice = uniq.slice(i, i + BATCH);
    const rows = await Promise.all(
      slice.map(async (p) => {
        const px = await getCloseOnOrBeforeReportDate(p.ticker, p.reportDate);
        return { k: `${p.ticker}|${p.reportDate}`, px };
      })
    );
    for (const { k, px } of rows) {
      if (px != null) map.set(k, px);
    }
  }
  return map;
}
