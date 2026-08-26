"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StaffRevenuePoint } from "./analytics-data";
import { ChartTooltip } from "./chart-tooltip";
import {
  CHART_CURSOR_FILL,
  CHART_GREEN,
  CHART_GRID,
  CHART_TICK,
} from "./chart-theme";

/** 目盛り・ラベル用の短縮表記（例: 12.3万 / 8,000） */
function formatCompact(value: number): string {
  if (value >= 10000) {
    const man = value / 10000;
    return `${man >= 10 ? Math.round(man) : Math.round(man * 10) / 10}万`;
  }
  return value.toLocaleString("ja-JP");
}

/** スタッフ別の売上（横棒グラフ） */
export function StaffRevenueChart({ data }: { data: StaffRevenuePoint[] }) {
  const height = data.length * 40 + 24;

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 44, left: 8, bottom: 0 }}
        >
          <CartesianGrid horizontal={false} stroke={CHART_GRID} />
          <XAxis
            type="number"
            allowDecimals={false}
            tickLine={false}
            axisLine={{ stroke: CHART_GRID }}
            tick={{ fontSize: 11, fill: CHART_TICK }}
            tickFormatter={(value: number) => formatCompact(value)}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={104}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: CHART_TICK }}
          />
          <Tooltip
            content={<ChartTooltip labelKey="label" unit="円" />}
            cursor={{ fill: CHART_CURSOR_FILL }}
          />
          <Bar
            dataKey="revenue"
            name="売上"
            fill={CHART_GREEN}
            maxBarSize={18}
            radius={[0, 4, 4, 0]}
          >
            <LabelList
              dataKey="revenue"
              position="right"
              fontSize={11}
              fill="#374151"
              formatter={(value: number) => formatCompact(value)}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
