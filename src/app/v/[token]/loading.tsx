import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** 予約確認ページの読み込み中表示 */
export default function PublicReservationLoading() {
  return (
    <div className="min-h-screen bg-gray-50" role="status" aria-live="polite">
      <span className="sr-only">読み込み中です</span>

      <div className="h-1.5 bg-brand" />

      {/* ヘッダー（店舗名） */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-md items-center justify-center px-4">
          <Skeleton className="h-5 w-40" />
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-8">
        <div className="mb-5 flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        <Card>
          <CardContent className="p-5">
            {/* 予約番号 */}
            <div className="rounded-lg bg-gray-50 px-4 py-3">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="mt-2 h-6 w-36" />
            </div>

            {/* 明細（日時・メニュー・担当・料金・お名前） */}
            <div className="mt-2 divide-y divide-gray-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start justify-between gap-4 py-2.5">
                  <Skeleton className="h-4 w-16 shrink-0" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* キャンセル操作の領域 */}
        <div className="mt-8">
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="mx-auto mt-3 h-3 w-56 max-w-full" />
        </div>
      </main>

      <footer className="pb-10 pt-2">
        <Skeleton className="mx-auto h-3 w-32" />
      </footer>
    </div>
  );
}
