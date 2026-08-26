import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** ダッシュボードホームの読み込み中表示 */
export default function DashboardLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">読み込み中です</span>

      {/* PageHeader */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-44" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        </div>
      </div>

      <div className="space-y-6">
        {/* KPI 4枚 */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-start justify-between gap-3 p-5">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="mt-2.5 h-7 w-24" />
                  <Skeleton className="mt-2 h-3 w-28" />
                </div>
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 本日の予約 / 最近の配信 */}
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, cardIndex) => (
            <Card key={cardIndex}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-4 w-16" />
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 border-t border-gray-100">
                  {Array.from({ length: 5 }).map((_, rowIndex) => (
                    <div key={rowIndex} className="flex items-center gap-3 px-5 py-3">
                      <Skeleton className="h-4 w-12 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <Skeleton className="h-4 w-32 max-w-full" />
                        <Skeleton className="mt-1.5 h-3 w-44 max-w-full" />
                      </div>
                      <Skeleton className="h-5 w-16 shrink-0 rounded-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
