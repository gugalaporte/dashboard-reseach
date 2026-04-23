import { cn } from "@/lib/utils";
import { formatDateShort, formatValue } from "@/lib/format";

// Celula especializada para Target Price: mostra valor + upside inline
// quando existe preco corrente na mesma moeda.
export function TargetCell({
  target,
  priceValue,
  priceCcy,
}: {
  target?: {
    value: number;
    ccy: string;
    date: string | null;
    periodo?: string | null;
  };
  priceValue?: number | null;
  priceCcy?: string | null;
}) {
  if (!target) return <span className="text-line/60 font-mono">–</span>;

  // Upside so quando precos na mesma moeda. Hoje stock_guide.price nao tem
  // coluna de moeda - assumimos R$ quando nao informada (base e brasileira).
  const effectivePriceCcy = priceCcy ?? "R$";
  const upside =
    priceValue != null && effectivePriceCcy === target.ccy
      ? ((target.value - priceValue) / priceValue) * 100
      : null;

  const sub = [target.periodo, target.date ? formatDateShort(target.date) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col leading-tight">
      <div className="flex items-baseline gap-2">
        <span className="font-mono tabular text-[13px] text-ink">
          {formatValue(target.value, "money", target.ccy)}
        </span>
        {upside != null && (
          <span
            className={cn(
              "font-mono text-[10px] tabular",
              upside >= 0 ? "text-emerald-700" : "text-red-700"
            )}
          >
            {upside >= 0 ? "+" : ""}
            {upside.toFixed(1)}%
          </span>
        )}
      </div>
      {sub && (
        <span className="text-[10px] font-light tracking-tight text-ink/50 mt-1 tabular">
          {sub}
        </span>
      )}
    </div>
  );
}
