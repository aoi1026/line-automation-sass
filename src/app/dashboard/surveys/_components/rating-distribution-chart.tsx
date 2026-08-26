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

export type RatingDistributionPoint = {
  /** 評価ラベル（例: "★1"〜"★5"） */
  label: string;
  count: number;
};

/** 5段階評価の1〜5分布バーチャート */
export function RatingDistributionChart({ data }: { data: RatingDistributionPoint[] }) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#f3f4f6" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "#f3f4f6" }}
            tick={{ fontSize: 11, fill: "#6b7280" }}
          />
          <YAxis
            allowDecimals={false}
            width={32}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: "#6b7280" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(17, 24, 39, 0.04)" }}
            formatter={(value: unknown) => [`${Number(value)}件`, "回答数"]}
            labelStyle={{ fontSize: 12, color: "#374151" }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          />
          <Bar dataKey="count" name="回答数" fill="#04a53f" maxBarSize={28} radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="count"
              position="top"
              fontSize={11}
              fill="#374151"
              formatter={(value: unknown) => (Number(value) > 0 ? String(value) : "")}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
