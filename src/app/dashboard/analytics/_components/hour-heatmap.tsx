"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { HeatmapRow } from "./analytics-data";

/** 件数比からセルの背景色（ブランドグリーンの濃淡）を作る */
function cellStyle(count: number, maxCount: number): React.CSSProperties | undefined {
  if (count <= 0) return undefined;
  const ratio = maxCount > 0 ? count / maxCount : 0;
  const alpha = 0.15 + 0.75 * ratio;
  return { backgroundColor: `rgba(6, 199, 85, ${alpha.toFixed(3)})` };
}

/** 曜日 × 時間帯の予約件数ヒートマップ（CSS Grid + 背景色の濃淡） */
export function HourHeatmap({
  hours,
  rows,
  maxCount,
}: {
  hours: number[];
  rows: HeatmapRow[];
  maxCount: number;
}) {
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `2.25rem repeat(${hours.length}, minmax(1.75rem, 1fr))`,
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[34rem]">
          <div className="grid gap-1" style={gridStyle}>
            <div className="pr-1 text-right text-[10px] font-medium text-gray-400">時</div>
            {hours.map((hour) => (
              <div
                key={`head-${hour}`}
                className="text-center text-[10px] tabular-nums text-gray-500"
              >
                {hour}
              </div>
            ))}
            {rows.map((row) => (
              <React.Fragment key={row.dayLabel}>
                <div className="flex h-8 items-center justify-end pr-1 text-xs font-medium text-gray-600">
                  {row.dayLabel}
                </div>
                {row.counts.map((count, i) => {
                  const ratio = maxCount > 0 ? count / maxCount : 0;
                  return (
                    <div
                      key={`${row.dayLabel}-${hours[i]}`}
                      title={`${row.dayLabel}曜 ${hours[i]}時台 ${count.toLocaleString("ja-JP")}件`}
                      className={cn(
                        "flex h-8 items-center justify-center rounded-md text-[10px] font-semibold tabular-nums",
                        count === 0
                          ? "bg-gray-50 text-gray-300"
                          : ratio > 0.6
                            ? "text-white"
                            : "text-brand-dark"
                      )}
                      style={cellStyle(count, maxCount)}
                    >
                      {count > 0 ? count : ""}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex items-center justify-end gap-2 text-[10px] text-gray-500">
        <span>少ない</span>
        <div className="flex items-center gap-0.5">
          <span className="h-3 w-5 rounded-sm bg-gray-50" />
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <span
              key={ratio}
              className="h-3 w-5 rounded-sm"
              style={{ backgroundColor: `rgba(6, 199, 85, ${(0.15 + 0.75 * ratio).toFixed(3)})` }}
            />
          ))}
        </div>
        <span>多い</span>
      </div>
    </div>
  );
}
