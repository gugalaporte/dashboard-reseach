"use client";

import * as React from "react";

// Hook que busca cotacoes em tempo real (via /api/quotes) e revalida
// periodicamente. Trata lista estavel: so refaz fetch se conjunto mudar.

export type LivePrice = {
  price: number;
  currency: string;
  asOf: string; // ISO
};

export type LivePricesMap = Map<string, LivePrice>;

// Chave estavel para comparar listas de tickers sem depender de ordem.
function tickersKey(tickers: string[]): string {
  return [...tickers].sort().join(",");
}

// Pooling: 60s bate com TTL do cache server-side.
const REFRESH_MS = 60_000;

export function useLivePrices(tickers: string[]): {
  prices: LivePricesMap;
  isLoading: boolean;
  lastUpdate: Date | null;
} {
  const [prices, setPrices] = React.useState<LivePricesMap>(new Map());
  const [isLoading, setIsLoading] = React.useState(false);
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);

  const key = React.useMemo(() => tickersKey(tickers), [tickers]);

  React.useEffect(() => {
    if (!key) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/quotes?tickers=${encodeURIComponent(key)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Record<string, LivePrice> = await res.json();
        if (cancelled) return;
        const map: LivePricesMap = new Map();
        for (const [t, p] of Object.entries(data)) map.set(t, p);
        setPrices(map);
        setLastUpdate(new Date());
      } catch (err) {
        console.error("[use-live-prices]", err);
        // Em erro mantemos o map atual; fallback p/ banco acontece no consumidor.
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [key]);

  return { prices, isLoading, lastUpdate };
}
