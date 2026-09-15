"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildVolumeBars,
  formatBarLabel,
  formatVolume,
  partialNote,
  pickVolumeGrain,
  volumeAxis,
  volumeHeadline,
  type VolumeBar,
} from "@/lib/trade-volume";
import { Skeleton } from "@/components/ui/skeleton";

const BAR = "#f0a202";
const BAR_PEAK = "#ffc44d";
const GRID = "rgba(241,241,241,0.12)";
const TICK = "rgba(241,241,241,0.55)";

type Props = {
  executions: Array<{ tradeDateIso: string; notional: number }>;
  fromIso: string;
  toIso: string;
  isLoading?: boolean;
};

type ChartRow = VolumeBar & { plot: number; plotLabel: string; isPeak: boolean };

/** Barras de volume financeiro no estilo Bloomberg, com valor em cada mês. */
export function TradeVolumeChart({
  executions,
  fromIso,
  toIso,
  isLoading,
}: Props) {
  const grain = pickVolumeGrain(fromIso, toIso);
  const bars: VolumeBar[] = isLoading
    ? []
    : buildVolumeBars(executions, grain, toIso, { fromIso, toIso });
  const headline = volumeHeadline(bars);
  const axis = volumeAxis(Math.max(0, ...bars.map((b) => b.totalNotional)));
  const note = partialNote(bars, grain);
  const chartData: ChartRow[] = bars.map((b) => ({
    ...b,
    plot: b.totalNotional / axis.divisor,
    plotLabel: formatBarLabel(b.totalNotional),
    isPeak: b.key === headline.peakKey,
  }));
  const seriesHint =
    grain === "year" ? "Volume financeiro no ano" : "Volume financeiro no mês";

  return (
    <section className="rounded-md overflow-hidden bg-navy text-surface-soft">
      <div className="px-4 sm:px-5 pt-5 pb-2">
        <h2 className="font-display text-[22px] sm:text-[26px] leading-tight tracking-tight">
          {isLoading ? "Volume de execução" : headline.title}
        </h2>
        <p className="text-[13px] text-surface-soft/60 mt-1.5 max-w-3xl">
          {isLoading ? "Carregando volume negociado no período…" : headline.subtitle}
        </p>
        <div className="flex items-center gap-2 mt-4">
          <span className="inline-block w-3 h-3 rounded-[2px]" style={{ background: BAR }} />
          <span className="text-[12px] text-surface-soft/75">
            {seriesHint} (compra + venda)
          </span>
        </div>
      </div>

      <div className="px-1 sm:px-2 h-[320px] relative">
        <span className="absolute right-4 top-1 text-[11px] text-surface-soft/45 tabular">
          {axis.suffix ? `R$ ${axis.suffix}` : "R$"}
        </span>
        {isLoading ? (
          <div className="h-full px-4 py-8">
            <Skeleton className="h-full w-full bg-surface-soft/10" />
          </div>
        ) : chartData.length === 0 ? (
          <p className="h-full grid place-items-center text-sm text-surface-soft/40">
            Sem volume no período / filtros selecionados
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 36, right: 48, left: 8, bottom: 8 }}
            >
              <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="0" />
              <XAxis
                dataKey="label"
                tick={{ fill: TICK, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={chartData.length > 18 ? "preserveStartEnd" : 0}
              />
              <YAxis
                orientation="right"
                domain={[0, axis.max]}
                ticks={yTicks(axis.max)}
                tick={{ fill: TICK, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                cursor={{ fill: "rgba(241,241,241,0.06)" }}
                contentStyle={{
                  background: "#030a1e",
                  border: "1px solid rgba(241,241,241,0.15)",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#f1f1f1",
                }}
                formatter={(_value, _name, item) => {
                  const bar = item?.payload as ChartRow | undefined;
                  const total = bar?.totalNotional ?? 0;
                  const extra =
                    bar && bar.sessionCount > 0
                      ? ` · ADTV ${formatVolume(bar.adtv, volumeAxis(bar.adtv))}`
                      : "";
                  return [formatVolume(total, axis) + extra, "Volume"];
                }}
                labelFormatter={(label) => String(label)}
              />
              <Bar dataKey="plot" radius={[2, 2, 0, 0]} maxBarSize={56}>
                {chartData.map((d) => (
                  <Cell
                    key={d.key}
                    fill={d.isPeak ? BAR_PEAK : BAR}
                    fillOpacity={d.totalNotional <= 0 ? 0.15 : d.partial ? 0.75 : 1}
                  />
                ))}
                <LabelList
                  dataKey="plotLabel"
                  position="top"
                  fill="rgba(241,241,241,0.88)"
                  fontSize={10}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="px-4 sm:px-5 pb-4 pt-1 flex flex-wrap items-end justify-between gap-2">
        <p className="text-[11px] text-surface-soft/40">
          {note ? `Nota: ${note}` : "Valor = volume financeiro negociado no período"}
        </p>
        <p className="text-[11px] text-surface-soft/35">Fonte: Finacap</p>
      </div>
    </section>
  );
}

function yTicks(max: number): number[] {
  const step = max / 4;
  return [0, step, step * 2, step * 3, max];
}
