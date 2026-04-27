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
