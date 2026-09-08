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
} from "recharts";
import { indexTo100, sliceLastDays, type MarketPoint } from "@/lib/mercado";
import { formatNumber } from "@/lib/format";

const COLORS = ["#1b61b6", "#059669", "#b8860b", "#c0392b", "#7c3aed", "#4492cc"];

function fmtDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}`;
}

type Series = { name: string; points: MarketPoint[] };

type Props = {
  title: string;
  series: Series[];
  days: number;
  hint?: string;
};

/** Gráfico de evolução indexada a 100 no início da janela. */
export function MercadoLineChart({ title, series, days, hint }: Props) {
  const indexed = series
    .map((s) => ({
      name: s.name,
      points: indexTo100(sliceLastDays(s.points, days)),
    }))
    .filter((s) => s.points.length > 0);

  const dates = new Set<string>();
  for (const s of indexed) for (const p of s.points) dates.add(p.date);
  const rows = [...dates].sort().map((date) => {
    const row: Record<string, string | number | null> = { date };
    for (const s of indexed) {
      row[s.name] = s.points.find((p) => p.date === date)?.value ?? null;
    }
    return row;
  });

  return (
    <div className="border border-line bg-white overflow-hidden">
      <div className="px-3 py-2.5 border-b border-line flex items-start justify-between gap-2">
        <h4 className="text-[10px] uppercase tracking-[0.14em] font-medium text-ink/70">
          {title}
        </h4>
        <span className="text-[10px] text-ink/35">
          {hint ?? "Base 100 no início da janela"}
        </span>
      </div>
      <div className="px-1 py-2 h-[240px]">
        {rows.length === 0 ? (
          <p className="text-sm text-ink/40 grid place-items-center h-full">
            Sem série neste período
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                tickFormatter={fmtDate}
                tick={{ fontSize: 10 }}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => formatNumber(Number(v), 0)}
                domain={["auto", "auto"]}
              />
              <Tooltip
                labelFormatter={(l) => fmtDate(String(l))}
                formatter={(v) => formatNumber(Number(v), 1)}
                contentStyle={{ fontSize: 11, borderRadius: 4 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {indexed.map((s, i) => (
                <Line
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={COLORS[i % COLORS.length]}
                  dot={false}
                  strokeWidth={1.8}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
