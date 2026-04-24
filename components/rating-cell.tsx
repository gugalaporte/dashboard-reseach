import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/format";
import { classifyRating } from "@/lib/rating";

// Dot + label em uppercase pequeno - estilo terminal, sem badge solido.
// Cor da bolinha segue o bucket (bullish/bearish/neutral/unknown).
function dotClass(rating: string): string {
  const bucket = classifyRating(rating);
  if (bucket === "bullish") return "bg-emerald-600";
  if (bucket === "bearish") return "bg-red-600";
  if (bucket === "neutral") return "bg-ink/40";
  return "bg-ink/20"; // Not Rated, Under Review, n.a.
}

export function RatingCell({
  rating,
  date,
}: {
  rating?: string | null;
  date?: string | null;
}) {
  if (!rating) return <span className="text-line/60 font-mono">–</span>;
  return (
    <div className="flex flex-col leading-tight">
      <div className="inline-flex items-center gap-2">
        <span className={cn("w-1.5 h-1.5 rounded-full", dotClass(rating))} />
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink">
          {rating}
        </span>
      </div>
      {date && (
        <span className="text-[10px] font-light text-ink/50 mt-1 tabular">
          {formatDateShort(date)}
        </span>
      )}
    </div>
  );
}
