// Agrupa os nomes que bancos diferentes usam para a mesma recomendacao.
// Bullish  -> Outperform, Buy, Strong Buy, Overweight
// Bearish  -> Underperform, Sell, Underweight
// Neutral  -> Neutral, Hold, Market Perform, Neutral Weight
export type RatingBucket = "bullish" | "bearish" | "neutral" | "unknown";

export function classifyRating(
  rating: string | null | undefined
): RatingBucket {
  if (!rating) return "unknown";
  const r = rating.trim().toLowerCase();
  const normalized = r.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  if (
    normalized === "outperform" ||
    normalized === "buy" ||
    normalized === "strong buy" ||
    normalized === "overweight"
  )
    return "bullish";
  if (
    normalized === "underperform" ||
    normalized === "sell" ||
    normalized === "underweight"
  )
    return "bearish";
  if (
    normalized === "neutral" ||
    normalized === "hold" ||
    normalized === "market perform" ||
    normalized === "neutral weight"
  )
    return "neutral";
  return "unknown";
}
