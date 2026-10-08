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
import { pickEvolutionSeries, seriesFromAnnual } from "@/lib/bottom-up-series";
import { formatNumber } from "@/lib/format";

const BRAND = "#1b61b6";
const SOFT = "#4492cc";
const AMBER = "#b8860b";
const ROSE = "#c0392b";
const EMERALD = "#059669";

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

function toChart(points: SeriesPoint[]) {
  return points.map((p) => ({
    label: p.label ?? p.date.slice(0, 4),
    roe: p.roe,
    roic: p.roic,
    ebitdaMargin: p.ebitdaMargin,
    netMargin: p.netMargin,
    netDebtEbitda: p.netDebtEbitda,
  }));
}

function isQuarterly(points: SeriesPoint[]): boolean {
  return points.some((p) => /[1-4]T\d{2}/.test(p.label ?? ""));
}

type Props = {
  series: SeriesPoint[];
  annual: AnnualPoint[];
  fiscal?: SeriesPoint[];
};

/** Gráficos de evolução. Trimestre quando a base tiver; senão ano. */
export function BottomUpCharts({ series, annual, fiscal }: Props) {
  const hist = fiscal ?? seriesFromAnnual(annual);
  const roe = pickEvolutionSeries(series, hist, ["roe", "roic"]);
  const margins = pickEvolutionSeries(series, hist, ["ebitdaMargin", "netMargin"]);
  const nd = pickEvolutionSeries(series, hist, ["netDebtEbitda"]);
  const useQBars = isQuarterly(hist);
  const annualOk = annual.filter((a) => a.freeCashFlow != null || a.ebitda != null);
  const barData = useQBars
    ? hist.map((p) => ({
        label: p.label ?? p.date.slice(0, 4),
        fcf: p.freeCashFlow != null ? p.freeCashFlow / 1e6 : null,
        ebitda: p.ebitda != null ? p.ebitda / 1e6 : null,
      }))
    : annualOk.map((a) => ({
        label: String(a.year),
        fcf: a.freeCashFlow != null ? a.freeCashFlow / 1e6 : null,
        ebitda: a.ebitda != null ? a.ebitda / 1e6 : null,
      }));
  const barOk = barData.filter((d) => d.fcf != null || d.ebitda != null).length >= 2;

  const empty =
    roe.length === 0 &&
    margins.length === 0 &&
    nd.length === 0 &&
    !barOk;

  if (empty) {
    return (
      <p className="text-sm text-ink/40 py-6 text-center">
        Sem evolução (são necessários pelo menos dois períodos).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {roe.length > 0 && (
        <QualityChart
          title="ROE / ROIC"
          hint={`% ${isQuarterly(roe) ? "trimestral" : "anual"}`}
          data={toChart(roe)}
          lines={[
            { key: "roe", name: "ROE", color: BRAND },
            { key: "roic", name: "ROIC", color: AMBER },
          ]}
          digits={1}
        />
      )}
      {margins.length > 0 && (
        <QualityChart
          title="Margens"
          hint={`EBITDA e líquida (% ${isQuarterly(margins) ? "trimestral" : "anual"})`}
          data={toChart(margins)}
          lines={[
            { key: "ebitdaMargin", name: "Margem EBITDA", color: EMERALD },
            { key: "netMargin", name: "Margem líquida", color: SOFT },
          ]}
          digits={1}
        />
      )}
      {nd.length > 0 && (
        <QualityChart
          title="Dívida / EBITDA"
          hint={`${isQuarterly(nd) ? "trimestral" : "anual"} · menor = melhor`}
          data={toChart(nd)}
          lines={[{ key: "netDebtEbitda", name: "Dív./EBITDA", color: ROSE }]}
          digits={2}
        />
      )}
      {barOk && (
        <ChartCard
          title={useQBars ? "FCF e EBITDA" : "FCF e EBITDA anuais"}
          hint="R$ milhões"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={12} />
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
                dot={{ r: 3 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

function QualityChart({
  title,
  hint,
  data,
  lines,
  digits,
}: {
  title: string;
  hint: string;
  data: ReturnType<typeof toChart>;
  lines: Array<{ key: string; name: string; color: string }>;
  digits: number;
}) {
  return (
    <ChartCard title={title} hint={hint}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tick={{ fontSize: 10 }} width={36} />
          <Tooltip
            contentStyle={tipStyle}
            formatter={(v: number) => formatNumber(v, digits)}
          />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {lines.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.name}
              stroke={l.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
