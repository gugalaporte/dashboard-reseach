import { cn } from "@/lib/utils";
import { formatDateShort, formatValue } from "@/lib/format";

// Mapeia fonte completa -> label curto exibido no badge "via XXX".
const SOURCE_LABEL: Record<string, string> = {
  "Bradesco BBI": "BBI",
  "BTG Pactual": "BTG",
  Safra: "SAFRA",
};

// Celula especializada para Target Price: mostra valor + upside inline.
// Preferencia para o upside: (1) valor pre-calculado em target.upside;
// (2) calculo local quando temos priceValue na mesma moeda.
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
    upside?: number | null;
    is_fallback?: boolean;
    fallback_source?: string;
  };
  priceValue?: number | null;
  priceCcy?: string | null;
}) {
  if (!target) return <span className="text-line/60 font-mono">–</span>;

  // Hoje stock_guide.price nao tem coluna de moeda - assumimos R$
  // quando nao informada (base e brasileira).
  const effectivePriceCcy = priceCcy ?? "R$";

  // Upside do banco (do stock_guide) quando existir; senao calcula local.
  const upside =
    target.upside != null
      ? target.upside
      : priceValue != null && effectivePriceCcy === target.ccy
        ? ((target.value - priceValue) / priceValue) * 100
        : null;

  const fallbackLabel = target.is_fallback && target.fallback_source
    ? SOURCE_LABEL[target.fallback_source] ?? target.fallback_source
    : null;

  // Subtexto: periodo + data + (quando fallback) sinal "via XXX".
  // Mantem tudo em uma linha fina, sem competir com o valor principal.
  const sub = [
    target.periodo,
    target.date ? formatDateShort(target.date) : null,
    fallbackLabel ? `via ${fallbackLabel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col leading-tight">
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-mono tabular text-[13px]",
            // Valor em italico + opacidade reduzida quando o TP nao e da propria
            // corretora da linha (herdado via fallback).
            target.is_fallback ? "text-ink/70 italic" : "text-ink"
          )}
        >
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
        <span
          className={cn(
            "text-[10px] font-light tracking-tight mt-1 tabular",
            target.is_fallback ? "text-ink/60 italic" : "text-ink/50"
          )}
          title={
            target.is_fallback && target.fallback_source
              ? `Target herdado de ${target.fallback_source} (linha sem cobertura propria)`
              : undefined
          }
        >
          {sub}
        </span>
      )}
    </div>
  );
}
