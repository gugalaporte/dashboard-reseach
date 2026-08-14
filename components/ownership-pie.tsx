"use client";

import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatNumber } from "@/lib/format";
import type { OwnershipSlice } from "@/lib/governanca-ownership";

function fmtPct(v: number): string {
  return `${formatNumber(v, 1)}%`;
}

/** Pizza + legenda alinhada (nome à esquerda, % à direita). */
export function OwnershipPie({
  slices,
  size = 180,
}: {
  slices: OwnershipSlice[];
  size?: number;
}) {
  if (slices.length === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
      <div className="shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="pct"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={size * 0.28}
              outerRadius={size * 0.46}
              stroke="#fff"
              strokeWidth={1.5}
              paddingAngle={0.6}
            >
              {slices.map((s) => (
                <Cell key={s.name} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => fmtPct(v)}
              contentStyle={{
                fontSize: 12,
                border: "1px solid #D8D8D8",
                borderRadius: 2,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex-1 w-full min-w-0 space-y-2">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-2.5">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: s.color }}
            />
            <span className="flex-1 truncate text-[13px] text-ink/75">
              {s.name}
            </span>
            <span className="tabular text-[13px] text-ink shrink-0">
              {fmtPct(s.pct)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
