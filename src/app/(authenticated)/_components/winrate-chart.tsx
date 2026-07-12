"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

export interface TrendPoint {
  date: string; // バケット開始日 YYYY-MM-DD
  rate: number; // 勝率 %
  wins: number;
  total: number;
}

type Bucket = "week" | "month";

function formatLabel(date: string, bucket: Bucket): string {
  const [y, m, d] = date.split("-").map(Number);
  return bucket === "month" ? `${y}/${m}` : `${m}/${d}`;
}

function ChartTooltip({
  active,
  payload,
  bucket,
}: {
  active?: boolean;
  payload?: { payload: TrendPoint }[];
  bucket: Bucket;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const [y, m, d] = p.date.split("-").map(Number);
  const label =
    bucket === "month" ? `${y}年${m}月` : `${y}/${m}/${d} の週`;
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-semibold stat-number text-sm">{p.rate}%</p>
      <p className="text-muted-foreground stat-number">
        {p.wins}勝 / {p.total}試合
      </p>
    </div>
  );
}

export function WinrateChart({
  weekly,
  monthly,
}: {
  weekly: TrendPoint[];
  monthly: TrendPoint[];
}) {
  const [bucket, setBucket] = useState<Bucket>("week");
  const data = bucket === "week" ? weekly : monthly;

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {(
          [
            { key: "week", label: "週別" },
            { key: "month", label: "月別" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setBucket(t.key)}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${
              bucket === t.key
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid
              stroke="var(--border)"
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tickFormatter={(v: string) => formatLabel(v, bucket)}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={24}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            {/* 50%（勝ち越しライン）の基準線 */}
            <ReferenceLine
              y={50}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <Tooltip
              content={<ChartTooltip bucket={bucket} />}
              cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.3 }}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={data.length <= 30 ? { r: 3, fill: "var(--primary)", strokeWidth: 0 } : false}
              activeDot={{ r: 5, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
