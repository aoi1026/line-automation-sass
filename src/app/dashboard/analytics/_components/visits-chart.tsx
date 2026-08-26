"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "./chart-tooltip";
import {
  CHART_CURSOR_FILL,
  CHART_GRAY,
  CHART_GREEN,
  CHART_GRID,
  CHART_TICK,
} from "./chart-theme";

export type VisitsChartPoint = {
  /** 軸ラベル（例: "8/26"） */
  label: string;
  /** ツールチップ用の正式表記（例: "2026年8月26日(水)" / "8月20日〜8月26日"） */
  fullLabel: string;
  /** 初来店の件数 */
  newCount: number;
  /** リピーターの件数 */
  repeatCount: number;
};

/** 新規・リピーターの内訳（積み上げ棒グラフ） */
export function VisitsChart({ data }: { data: VisitsChartPoint[] }) {
  const tickInterval = data.length > 40 ? 7 : data.length > 14 ? 3 : 0;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_GRID} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: CHART_GRID }}
            interval={tickInterval}
            tick={{ fontSize: 11, fill: CHART_TICK }}
          />
          <YAxis
            allowDecimals={false}
            width={36}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: CHART_TICK }}
          />
          <Tooltip
            content={<ChartTooltip labelKey="fullLabel" showTotal />}
            cursor={{ fill: CHART_CURSOR_FILL }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
          />
          <Bar
            dataKey="repeatCount"
            name="リピーター"
            stackId="visits"
            fill={CHART_GREEN}
            stroke="#ffffff"
            strokeWidth={1}
            maxBarSize={24}
          />
          <Bar
            dataKey="newCount"
            name="新規"
            stackId="visits"
            fill={CHART_GRAY}
            stroke="#ffffff"
            strokeWidth={1}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
