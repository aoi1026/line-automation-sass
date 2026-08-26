import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** チャート下部の目盛りラベル幅 */
const AXIS_LABEL_WIDTHS = ["w-8", "w-10", "w-8", "w-12", "w-8", "w-10", "w-9"];

/** 棒グラフ風スケルトンの高さ（%） */
const BAR_HEIGHTS = [45, 72, 38, 88, 60, 52, 80, 34, 66, 48, 76, 58];

/** 分析レポートページの読み込み中表示 */
export default function AnalyticsLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">読み込み中です</span>

      {/* PageHeader（期間切替タブ付き） */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-36" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        </div>
        <div className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg bg-gray-100 p-1">
          <Skeleton className="h-8 w-16 rounded-md bg-gray-300/70" />
          <Skeleton className="h-8 w-16 rounded-md bg-gray-300/70" />
          <Skeleton className="h-8 w-16 rounded-md bg-gray-300/70" />
        </div>
      </div>

      <div className="space-y-6">
        {/* KPI 4枚 */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2.5 h-7 w-24" />
                  <Skeleton className="mt-2 h-3 w-32 max-w-full" />
                </div>
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 大きなチャート領域2つ */}
        {Array.from({ length: 2 }).map((_, chartIndex) => (
          <Card key={chartIndex}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-1 h-3.5 w-80 max-w-full" />
            </CardHeader>
            <CardContent>
              <div className="flex h-64 items-end gap-2 sm:gap-3">
                {BAR_HEIGHTS.map((height, barIndex) => (
                  <Skeleton
                    key={barIndex}
                    className="flex-1 rounded-t-md"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                {AXIS_LABEL_WIDTHS.map((width, labelIndex) => (
                  <Skeleton key={labelIndex} className={`h-3 ${width}`} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
