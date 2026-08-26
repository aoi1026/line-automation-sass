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
import { ChartTooltip } from "./chart-tooltip";
import {
  CHART_CURSOR_FILL,
  CHART_GREEN,
  CHART_GRID,
  CHART_TICK,
} from "./chart-theme";

export type MessageKindChartPoint = {
  /** 種別の日本語ラベル */
  label: string;
  count: number;
};

/** メッセージ種別ごとの配信件数（横棒グラフ） */
export function MessageKindChart({ data }: { data: MessageKindChartPoint[] }) {
  const height = data.length * 40 + 24;

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 32, left: 8, bottom: 0 }}
        >
          <CartesianGrid horizontal={false} stroke={CHART_GRID} />
          <XAxis
            type="number"
            allowDecimals={false}
            tickLine={false}
            axisLine={{ stroke: CHART_GRID }}
            tick={{ fontSize: 11, fill: CHART_TICK }}
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
            content={<ChartTooltip labelKey="label" />}
            cursor={{ fill: CHART_CURSOR_FILL }}
          />
          <Bar
            dataKey="count"
            name="配信数"
            fill={CHART_GREEN}
            maxBarSize={18}
            radius={[0, 4, 4, 0]}
          >
            <LabelList
              dataKey="count"
              position="right"
              fontSize={11}
              fill="#374151"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
