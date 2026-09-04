"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function SeasonProgressChart({
  data,
}: {
  data: { matchweek: number; points: number }[];
}) {
  if (!data.length) {
    return (
      <p className="py-12 text-center text-sm text-on-surface-variant">
        No match data yet for season progress.
      </p>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#33d6e3" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#33d6e3" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#3b494b" vertical={false} />
          <XAxis
            dataKey="matchweek"
            tick={{ fill: "#849495", fontSize: 12 }}
            tickFormatter={(v) => `MW${v}`}
          />
          <YAxis tick={{ fill: "#849495", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: "#1e2024",
              border: "1px solid #3b494b",
              borderRadius: 8,
            }}
            labelFormatter={(v) => `Matchweek ${v}`}
          />
          <Area
            type="monotone"
            dataKey="points"
            stroke="#33d6e3"
            strokeWidth={2}
            fill="url(#pointsGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
