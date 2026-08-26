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
import { ChartTooltip } from "./chart-tooltip";
import { CHART_GREEN, CHART_GRID, CHART_TICK } from "./chart-theme";

export type TrendPoint = {
  /** 軸ラベル（例: "8/26"） */
  label: string;
  /** ツールチップ用の正式表記（例: "2026年8月26日(水)" / "8月20日〜8月26日"） */
  fullLabel: string;
  /** 来店数 */
  count: number;
};

/** 来店数の推移（エリアチャート） */
export function VisitsTrendChart({ data }: { data: TrendPoint[] }) {
  const tickInterval = data.length > 40 ? 7 : data.length > 14 ? 3 : 0;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="visitsTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_GREEN} stopOpacity={0.28} />
              <stop offset="100%" stopColor={CHART_GREEN} stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            content={<ChartTooltip labelKey="fullLabel" />}
            cursor={{ stroke: CHART_TICK, strokeDasharray: "3 3" }}
          />
          <Area
            type="monotone"
            dataKey="count"
            name="来店数"
            stroke={CHART_GREEN}
            strokeWidth={2}
            fill="url(#visitsTrendFill)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#ffffff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
