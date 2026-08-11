"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  ComposedChart,
} from "recharts";
import type { AnnualPoint, SeriesPoint } from "@/lib/bottom-up-types";
import { formatNumber } from "@/lib/format";

const BRAND = "#1b61b6";
const SOFT = "#4492cc";
const AMBER = "#b8860b";
const ROSE = "#c0392b";
const EMERALD = "#059669";

function yearLabel(iso: string): string {
  return iso.slice(0, 4);
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-line bg-white overflow-hidden">
      <div className="px-3 py-2.5 border-b border-line flex items-start justify-between gap-2">
        <h4 className="text-[10px] uppercase tracking-[0.14em] font-medium text-ink/70">
          {title}
        </h4>
        {hint ? (
          <span className="text-[10px] text-ink/35 text-right leading-snug">
            {hint}
          </span>
        ) : null}
      </div>
      <div className="px-1 py-2 h-[200px]">{children}</div>
    </div>
  );
}

const tipStyle = {
  fontSize: 11,
  borderRadius: 4,
  border: "1px solid #e5e7eb",
};

function hasAny(points: SeriesPoint[], keys: (keyof SeriesPoint)[]): boolean {
  return points.some((p) => keys.some((k) => p[k] != null));
}

type Props = {
  series: SeriesPoint[];
  annual: AnnualPoint[];
};

/** Gráficos de qualidade e FCF anual. */
export function BottomUpCharts({ series, annual }: Props) {
  const qualityData = series.map((p) => ({
    label: yearLabel(p.date),
    date: p.date,
    roe: p.roe,
    roic: p.roic,
    ebitdaMargin: p.ebitdaMargin,
    netMargin: p.netMargin,
    netDebtEbitda: p.netDebtEbitda,
  }));

  const annualData = annual.map((a) => ({
    label: String(a.year),
    fcf: a.freeCashFlow != null ? a.freeCashFlow / 1e6 : null,
    ebitda: a.ebitda != null ? a.ebitda / 1e6 : null,
  }));

  if (series.length === 0 && annual.length === 0) {
    return (
      <p className="text-sm text-ink/40 py-6 text-center">
        Sem série histórica disponível para este papel.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {hasAny(series, ["roe", "roic"]) && (
        <ChartCard title="ROE / ROIC" hint="% ao longo do tempo">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={qualityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={36} />
              <Tooltip
                contentStyle={tipStyle}
                formatter={(v: number) => formatNumber(v, 1)}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="roe"
                name="ROE"
                stroke={BRAND}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="roic"
                name="ROIC"
                stroke={AMBER}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {hasAny(series, ["ebitdaMargin", "netMargin"]) && (
        <ChartCard title="Margens" hint="EBITDA e líquida (%)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={qualityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={36} />
              <Tooltip
                contentStyle={tipStyle}
                formatter={(v: number) => formatNumber(v, 1)}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="ebitdaMargin"
                name="Margem EBITDA"
                stroke={EMERALD}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="netMargin"
                name="Margem líquida"
                stroke={SOFT}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {hasAny(series, ["netDebtEbitda"]) && (
        <ChartCard title="ND / EBITDA" hint="Menor = melhor">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={qualityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={36} />
              <Tooltip
                contentStyle={tipStyle}
                formatter={(v: number) => formatNumber(v, 2)}
              />
              <Line
                type="monotone"
                dataKey="netDebtEbitda"
                name="ND/EBITDA"
                stroke={ROSE}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {annualData.some((d) => d.fcf != null || d.ebitda != null) && (
        <ChartCard title="FCF e EBITDA anuais" hint="R$ milhões">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={annualData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip
                contentStyle={tipStyle}
                formatter={(v: number) => formatNumber(v, 0)}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="ebitda" name="EBITDA" fill={SOFT} opacity={0.7} />
              <Line
                type="monotone"
                dataKey="fcf"
                name="FCF"
                stroke={BRAND}
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}
