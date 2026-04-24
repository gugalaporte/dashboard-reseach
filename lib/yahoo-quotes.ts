import "server-only";
import YahooFinance from "yahoo-finance2";

// v3.x exige instancia (diferente da v2 que tinha singleton no default).
// suppressNotices evita o aviso de survey do mantenedor a cada boot.
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Cotacoes em tempo real (delayed ~15min para B3) via Yahoo Finance.
// Rodamos server-side porque Yahoo exige cookie/crumb + CORS bloqueia browser.
// yahoo-finance2 resolve o handshake sozinho; so precisamos usar sufixo .SA.

export type LiveQuote = {
  ticker: string; // ex.: "AXIA3"
  price: number;
  currency: string; // geralmente "BRL"
  asOf: string; // ISO timestamp
};

// TTL curto: suficiente para "tempo real" de dashboard sem bombardear Yahoo.
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
    regularMarketTime?: unknown;
    currency?: unknown;
  };

  try {
    // quote() tem overloads complicados que fazem o TS narrowar p/ never;
    // convertemos para um shape minimo e seguimos com guardas explicitas.
    const quotes = (await yahooFinance.quote(symbols)) as unknown;
    const list: RawQuote[] = Array.isArray(quotes)
      ? (quotes as RawQuote[])
      : [quotes as RawQuote];

    for (const q of list) {
      if (
        !q ||
        typeof q.symbol !== "string" ||
        typeof q.regularMarketPrice !== "number"
      ) {
        continue;
      }
      const ticker = fromYahooSymbol(q.symbol);
      const rmt = q.regularMarketTime;
      // regularMarketTime as vezes vem como Date (lib converte), as vezes number.
      const asOfMs =
        rmt instanceof Date
          ? rmt.getTime()
          : typeof rmt === "number"
            ? rmt * 1000
            : now;
      const live: LiveQuote = {
        ticker,
        price: q.regularMarketPrice,
        currency: typeof q.currency === "string" ? q.currency : "BRL",
        asOf: new Date(asOfMs).toISOString(),
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
