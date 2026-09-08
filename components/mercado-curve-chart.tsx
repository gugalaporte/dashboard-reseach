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
import type { CurveBoard } from "@/lib/mercado";
import { formatNumber } from "@/lib/format";

const COLORS = { now: "#1b61b6", week: "#059669", month: "#b8860b" };

type Props = { board: CurveBoard };

/** Evolução da curva: hoje vs 1 semana vs 1 mês. */
export function MercadoCurveChart({ board }: Props) {
  const data = board.points.map((p) => ({
    label: p.tenor,
    Hoje: p.now,
    "1S": p.weekAgo,
    "1M": p.monthAgo,
  }));
  const empty = data.every((d) => d.Hoje == null && d["1S"] == null && d["1M"] == null);

  return (
    <div className="border border-line bg-white overflow-hidden">
      <div className="px-3 py-2.5 border-b border-line">
        <h4 className="text-[10px] uppercase tracking-[0.14em] font-medium text-ink/70">
          {board.label}
        </h4>
      </div>
      <div className="px-1 py-2 h-[240px]">
        {empty ? (
          <p className="text-sm text-ink/40 grid place-items-center h-full">
            Sem pontos nesta curva
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => `${formatNumber(Number(v), 1)}%`}
                domain={["auto", "auto"]}
              />
              <Tooltip
                formatter={(v) => `${formatNumber(Number(v), 2)}%`}
                contentStyle={{ fontSize: 11, borderRadius: 4 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Hoje" stroke={COLORS.now} dot={{ r: 2 }} strokeWidth={1.8} connectNulls />
              <Line type="monotone" dataKey="1S" stroke={COLORS.week} dot={false} strokeWidth={1.5} connectNulls />
              <Line type="monotone" dataKey="1M" stroke={COLORS.month} dot={false} strokeWidth={1.5} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
