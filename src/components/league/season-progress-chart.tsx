"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function SeasonProgressChart({
  data,
  leaderPoints,
}: {
  data: { matchweek: number; points: number }[];
  leaderPoints?: number | null;
}) {
  if (!data.length) {
    return (
      <p className="py-12 text-center text-sm text-on-surface-variant">
        No match data yet for season progress.
      </p>
    );
  }

  const maxPoints = data[data.length - 1]?.points ?? 0;
  const showLeader =
    typeof leaderPoints === "number" && leaderPoints > maxPoints;
  const yMax = showLeader
    ? Math.ceil(((leaderPoints as number) + 3) / 5) * 5
    : undefined;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#33d6e3" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#33d6e3" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="#272d37" vertical={false} />
          <XAxis
            dataKey="matchweek"
            tick={{ fill: "#6c7480", fontSize: 12 }}
            tickFormatter={(v) => `MW${v}`}
          />
          <YAxis
            tick={{ fill: "#6c7480", fontSize: 12 }}
            domain={yMax ? [0, yMax] : undefined}
            allowDataOverflow={false}
          />
          <Tooltip
            contentStyle={{
              background: "#1b1f27",
              border: "1px solid #272d37",
              borderRadius: 8,
            }}
            labelFormatter={(v) => `Matchweek ${v}`}
          />
          {showLeader && (
            <ReferenceLine
              y={leaderPoints as number}
              stroke="#b7e12e"
              strokeDasharray="5 4"
              strokeOpacity={0.7}
              label={{
                value: `Leader ${leaderPoints}`,
                position: "insideTopRight",
                fill: "#b7e12e",
                fontSize: 11,
              }}
            />
          )}
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
