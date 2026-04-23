import { cn } from "@/lib/utils";
import { formatDateShort } from "@/lib/format";

// Dot + label em uppercase pequeno - estilo terminal, sem badge solido.
function dotClass(rating: string): string {
  if (rating === "Outperform") return "bg-emerald-600";
  if (rating === "Underperform") return "bg-red-600";
  if (rating === "Neutral") return "bg-ink/40";
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
