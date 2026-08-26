"use client";

import type { TooltipProps } from "recharts";

/**
 * recharts 共通のカスタムツールチップ。
 * labelKey を指定すると、その行データのフィールドを見出しに使う（例: 正式な日付表記）。
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelKey,
  unit = "件",
  showTotal = false,
}: TooltipProps<number, string> & {
  labelKey?: string;
  unit?: string;
  showTotal?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const row = payload[0]?.payload as Record<string, unknown> | undefined;
  const fullLabel = labelKey && row ? row[labelKey] : undefined;
  const heading =
    typeof fullLabel === "string" ? fullLabel : label !== undefined ? String(label) : "";
  const total = payload.reduce((sum, entry) => sum + (entry.value ?? 0), 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      {heading && <p className="font-medium text-gray-900">{heading}</p>}
      <div className="mt-1 min-w-32 space-y-1">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600">{entry.name}</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums text-gray-900">
              {(entry.value ?? 0).toLocaleString("ja-JP")}
              {unit}
            </span>
          </div>
        ))}
        {showTotal && payload.length > 1 && (
          <div className="flex items-center gap-1.5 border-t border-gray-100 pt-1">
            <span className="text-gray-600">合計</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums text-gray-900">
              {total.toLocaleString("ja-JP")}
              {unit}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
