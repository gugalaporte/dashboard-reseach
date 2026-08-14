"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function avatarTone(ticker: string): string {
  const tones = [
    "bg-brand text-surface-soft",
    "bg-navy text-surface-soft",
    "bg-brand-soft text-surface-soft",
  ];
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = (hash + ticker.charCodeAt(i)) % tones.length;
  return tones[hash]!;
}

function initials(ticker: string): string {
  return ticker.replace(/\d+$/, "").slice(0, 2).toUpperCase();
}

type Props = {
  ticker: string;
  size?: "sm" | "lg";
};

const LOCAL_LOGOS: Record<string, string> = {
  AXIA3: "/logos/axia3.png",
  AXIA6: "/logos/axia3.png",
  AXIA7: "/logos/axia3.png",
};

/** Logo do papel (local ou ícones B3); cai para iniciais se não existir. */
export function CompanyLogo({ ticker, size = "sm" }: Props) {
  const [failed, setFailed] = React.useState(false);
  const box = size === "lg" ? "w-16 h-16 text-lg" : "w-11 h-11 text-sm";
  const src = LOCAL_LOGOS[ticker] ?? `https://icons.brapi.dev/icons/${ticker}.svg`;

  React.useEffect(() => {
    setFailed(false);
  }, [ticker, src]);

  if (failed) {
    return (
      <div
        className={cn(
          "shrink-0 rounded-md grid place-items-center font-display tracking-tight",
          box,
          avatarTone(ticker)
        )}
      >
        {initials(ticker)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "shrink-0 rounded-md bg-white border border-line grid place-items-center overflow-hidden p-1.5",
        box
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={ticker}
        className="w-full h-full object-contain"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
