import {
  formatDateShort,
  formatNumber,
  formatValue,
  type Format,
} from "@/lib/format";
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
  anchorBank,
  epsDerivedInfo,
}: {
  value?: number | null;
  date?: string | null;
  periodo?: string | null;
  ccy?: string | null;
  format: Format;
  derived?: boolean;
  formula?: string;
  priceDate?: string;
  anchorBank?: string;
  /** Tooltip especifico quando EPS veio de preço/P/E do report. */
  epsDerivedInfo?: {
    reportPrice: number;
    pe: number;
    peDate: string;
    usedYahooClose?: boolean;
  };
}) {
  if (value == null)
    return <span className="text-line/60 font-mono">–</span>;
  const sub = [periodo, date ? formatDateShort(date) : null]
    .filter(Boolean)
    .join(" · ");

  // Tooltip nativo HTML (sem dep).
  const tooltip = epsDerivedInfo
    ? epsDerivedInfo.usedYahooClose
      ? `EPS derivado: Fechamento Yahoo até a data do relatório (R$ ${formatNumber(
          epsDerivedInfo.reportPrice,
          2
        )}) / P/E (${formatNumber(epsDerivedInfo.pe, 1)}x) em ${
          epsDerivedInfo.peDate ? formatDateShort(epsDerivedInfo.peDate) : "—"
        }. Preço não constava no stock_guide. Nao publicado pela corretora.`
      : `EPS derivado: Preço no report (R$ ${formatNumber(epsDerivedInfo.reportPrice, 2)}) / P/E (${formatNumber(
          epsDerivedInfo.pe,
          1
        )}x) em ${
          epsDerivedInfo.peDate ? formatDateShort(epsDerivedInfo.peDate) : "—"
        }. Nao publicado pela corretora.`
    : derived && anchorBank
      ? `Derivado de ${anchorBank} via EPS: NI ${anchorBank} × (EPS casa / EPS ${anchorBank}) em ${
          priceDate ? formatDateShort(priceDate) : "—"
        }. Nao publicado pela corretora.`
      : derived
        ? `Derivado · ${formula ?? "calculado"}${
            priceDate ? ` em ${formatDateShort(priceDate)}` : ""
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
