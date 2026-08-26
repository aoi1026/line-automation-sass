import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** 自動配信設定ページの読み込み中表示 */
export default function AutomationsLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">読み込み中です</span>

      {/* PageHeader（今すぐ実行ボタン付き） */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-36" />
          <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 shrink-0 rounded-lg" />
      </div>

      {/* 自動配信のしくみ */}
      <Card className="mb-6">
        <CardContent className="flex items-start gap-3 p-5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-2.5 h-3.5 w-full" />
            <Skeleton className="mt-1.5 h-3.5 w-4/5" />
          </div>
        </CardContent>
      </Card>

      {/* 種別ごとの設定カード7枚 */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i}>
            <div className="flex items-start justify-between gap-4 p-5">
              <div className="flex min-w-0 items-start gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                <div className="min-w-0">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="mt-2 h-3.5 w-72 max-w-full" />
                  <Skeleton className="mt-1.5 h-3.5 w-52 max-w-full" />
                </div>
              </div>
              {/* スイッチの位置 */}
              <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
