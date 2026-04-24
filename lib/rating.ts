// Agrupa os nomes que bancos diferentes usam para a mesma recomendacao.
// Bullish  -> Outperform, Buy, Strong Buy, Overweight
// Bearish  -> Underperform, Sell, Underweight
// Neutral  -> Neutral, Hold, Market Perform
export type RatingBucket = "bullish" | "bearish" | "neutral" | "unknown";

export function classifyRating(
  rating: string | null | undefined
): RatingBucket {
  if (!rating) return "unknown";
  const r = rating.trim().toLowerCase();
  if (
    r === "outperform" ||
    r === "buy" ||
    r === "strong buy" ||
    r === "overweight"
  )
    return "bullish";
  if (r === "underperform" || r === "sell" || r === "underweight")
    return "bearish";
  if (r === "neutral" || r === "hold" || r === "market perform")
    return "neutral";
  return "unknown";
}
