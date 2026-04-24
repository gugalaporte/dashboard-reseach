import { formatDateShort, formatValue, type Format } from "@/lib/format";
import { cn } from "@/lib/utils";

// Celula de metrica: valor principal em cima (mono tabular), subtitulo com
// periodo/data abaixo em cinza leve.
// Quando `derived=true`, renderiza em italico + cor mais clara e coloca um
// tooltip nativo explicando a formula + data do preco usado.
export function MetricCell({
  value,
  date,
  periodo,
  ccy,
  format,
  derived,
  formula,
  priceDate,
}: {
  value?: number | null;
  date?: string | null;
  periodo?: string | null;
  ccy?: string | null;
  format: Format;
  derived?: boolean;
  formula?: string;
  priceDate?: string;
}) {
  if (value == null)
    return <span className="text-line/60 font-mono">–</span>;
  const sub = [periodo, date ? formatDateShort(date) : null]
    .filter(Boolean)
    .join(" · ");

  // Tooltip nativo HTML (sem dep). So aparece quando derivado.
  const tooltip = derived
    ? `Derivado · ${formula ?? "calculado"}${
        priceDate ? ` · preco em ${formatDateShort(priceDate)}` : ""
      }. Nao publicado pela corretora.`
    : undefined;

  return (
    <div
      className="flex flex-col leading-tight"
      title={tooltip}
    >
      <span
        className={cn(
          "font-mono tabular text-[13px]",
          derived ? "italic text-ink/60" : "text-ink"
        )}
      >
        {formatValue(value, format, ccy)}
        {derived && <span className="ml-1 text-[9px] align-super">ƒ</span>}
      </span>
      {sub && (
        <span className="text-[10px] font-light tracking-tight text-ink/50 mt-1 tabular">
          {sub}
        </span>
      )}
    </div>
  );
}
