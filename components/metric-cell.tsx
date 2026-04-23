import { formatDateShort, formatValue, type Format } from "@/lib/format";

// Celula de metrica: valor principal em cima (mono tabular), subtitulo com
// periodo/data abaixo em cinza leve.
export function MetricCell({
  value,
  date,
  periodo,
  ccy,
  format,
}: {
  value?: number | null;
  date?: string | null;
  periodo?: string | null;
  ccy?: string | null;
  format: Format;
}) {
  if (value == null)
    return <span className="text-line/60 font-mono">–</span>;
  const sub = [periodo, date ? formatDateShort(date) : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-mono tabular text-[13px] text-ink">
        {formatValue(value, format, ccy)}
      </span>
      {sub && (
        <span className="text-[10px] font-light tracking-tight text-ink/50 mt-1 tabular">
          {sub}
        </span>
      )}
    </div>
  );
}
