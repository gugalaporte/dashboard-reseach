"use client";

import type { ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LsegSeriesPoint } from "@/lib/lseg-series";

const BRAND = "#1b61b6";
const SOFT = "#4492cc";
const MUTED = "#94a3b8";
const AMBER = "#b8860b";
const ROSE = "#c0392b";
const EMERALD = "#059669";

function fmtDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}`;
}

function countNonNull(points: LsegSeriesPoint[], keys: (keyof LsegSeriesPoint)[]): number {
  let n = 0;
  for (const p of points) {
    if (keys.some((k) => p[k] != null)) n++;
  }
  return n;
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-line bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex items-start justify-between gap-3">
        <h3 className="text-[11px] uppercase tracking-[0.14em] font-medium text-ink/70">
          {title}
        </h3>
        {hint && (
          <span className="text-[10px] text-ink/40 text-right leading-snug max-w-[200px]">
            {hint}
          </span>
        )}
      </div>
      <div className="px-2 py-3 h-[280px]">{children}</div>
    </div>
  );
}

const tipStyle = {
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid #e5e7eb",
};

const dot = { r: 3, strokeWidth: 1 };
const activeDot = { r: 4 };

type Props = { ticker: string; points: LsegSeriesPoint[] };

export function LsegCharts({ ticker, points }: Props) {
  const sparseHint = (keys: (keyof LsegSeriesPoint)[]) => {
    const n = countNonNull(points, keys);
    if (n === 0) return "Sem dados neste período";
    if (n === 1) return "1 ponto (série ainda curta)";
    return null;
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <ChartCard
        title={`${ticker} — Preço + faixa 52 semanas`}
        hint={sparseHint(["price_52w_high", "price_52w_low"])}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="as_of_date" tickFormatter={fmtDate} minTickGap={40} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={48} domain={["auto", "auto"]} />
            <Tooltip contentStyle={tipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="price_52w_high"
              name="52W high"
              stroke={MUTED}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              dot={dot}
              activeDot={activeDot}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="price_52w_low"
              name="52W low"
              stroke={MUTED}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              dot={dot}
              activeDot={activeDot}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="price"
              name="Preço"
              stroke={BRAND}
              strokeWidth={2}
              dot={dot}
              activeDot={activeDot}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={`${ticker} — Preço + banda de price target`}
        hint={sparseHint(["price_target_high", "price_target_median", "price_target_low"])}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="as_of_date" tickFormatter={fmtDate} minTickGap={40} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={48} domain={["auto", "auto"]} />
            <Tooltip contentStyle={tipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="price_target_high"
              name="Alvo high"
              stroke={AMBER}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              dot={dot}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="price_target_median"
              name="Alvo mediana"
              stroke={AMBER}
              strokeWidth={1.5}
              dot={dot}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="price_target_low"
              name="Alvo low"
              stroke={AMBER}
              strokeDasharray="4 3"
              strokeWidth={1.5}
              dot={dot}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="price"
              name="Preço"
              stroke={BRAND}
              strokeWidth={2}
              dot={dot}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={`${ticker} — Retornos (momentum)`}
        hint={sparseHint(["ret_1m", "ret_3m", "ret_6m", "ret_ytd", "ret_1y"])}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="as_of_date" tickFormatter={fmtDate} minTickGap={40} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={48} unit="%" />
            <Tooltip contentStyle={tipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="ret_1m" name="1M" stroke={BRAND} strokeWidth={1.5} dot={dot} connectNulls={false} />
            <Line type="monotone" dataKey="ret_3m" name="3M" stroke={SOFT} strokeWidth={1.5} dot={dot} connectNulls={false} />
            <Line type="monotone" dataKey="ret_6m" name="6M" stroke={EMERALD} strokeWidth={1.5} dot={dot} connectNulls={false} />
            <Line type="monotone" dataKey="ret_ytd" name="YTD" stroke={AMBER} strokeWidth={1.5} dot={dot} connectNulls={false} />
            <Line type="monotone" dataKey="ret_1y" name="1Y" stroke={ROSE} strokeWidth={1.5} dot={dot} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={`${ticker} — Retorno total`} hint={sparseHint(["total_return"])}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="as_of_date" tickFormatter={fmtDate} minTickGap={40} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={48} />
            <Tooltip contentStyle={tipStyle} />
            <Line type="monotone" dataKey="total_return" name="Total return" stroke={MUTED} strokeWidth={2} dot={dot} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={`${ticker} — Volume diário`} hint={sparseHint(["day_volume"])}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="as_of_date" tickFormatter={fmtDate} minTickGap={40} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={56} />
            <Tooltip contentStyle={tipStyle} />
            <Bar dataKey="day_volume" name="Volume" fill={SOFT} fillOpacity={0.75} maxBarSize={48} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={`${ticker} — EV + dívida líquida (R$ M)`}
        hint={sparseHint(["enterprise_value", "net_debt"])}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="as_of_date" tickFormatter={fmtDate} minTickGap={40} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={56} />
            <Tooltip contentStyle={tipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="enterprise_value" name="EV" stroke={BRAND} strokeWidth={2} dot={dot} connectNulls={false} />
            <Line type="monotone" dataKey="net_debt" name="Net Debt" stroke={ROSE} strokeWidth={2} dot={dot} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title={`${ticker} — WACC`} hint={sparseHint(["wacc"])}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="as_of_date" tickFormatter={fmtDate} minTickGap={40} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={48} unit="%" />
            <Tooltip contentStyle={tipStyle} />
            <Line type="monotone" dataKey="wacc" name="WACC" stroke={BRAND} strokeWidth={2} dot={dot} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={`${ticker} — Margens`}
        hint={sparseHint(["gross_margin", "ebitda_margin"])}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="as_of_date" tickFormatter={fmtDate} minTickGap={40} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={48} unit="%" />
            <Tooltip contentStyle={tipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="gross_margin" name="Gross" stroke={BRAND} strokeWidth={2} dot={dot} connectNulls={false} />
            <Line type="monotone" dataKey="ebitda_margin" name="EBITDA" stroke={EMERALD} strokeWidth={2} dot={dot} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={`${ticker} — Liquidez`}
        hint={sparseHint(["current_ratio", "quick_ratio"])}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="as_of_date" tickFormatter={fmtDate} minTickGap={40} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={48} />
            <Tooltip contentStyle={tipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="current_ratio" name="Current" stroke={BRAND} strokeWidth={2} dot={dot} connectNulls={false} />
            <Line type="monotone" dataKey="quick_ratio" name="Quick" stroke={SOFT} strokeWidth={2} dot={dot} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
