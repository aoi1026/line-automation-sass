import { Skeleton } from "@/components/ui/skeleton";

/** Web予約ページの読み込み中表示 */
export default function PublicBookingLoading() {
  return (
    <div className="min-h-screen bg-gray-50" role="status" aria-live="polite">
      <span className="sr-only">読み込み中です</span>

      <div className="h-1.5 bg-brand" />

      {/* ヘッダー（店舗名・紹介文・住所・電話） */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-md px-4 pb-5 pt-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-6 w-48 max-w-full" />
          <Skeleton className="mt-3 h-3.5 w-full" />
          <Skeleton className="mt-1.5 h-3.5 w-3/5" />
          <div className="mt-3 flex flex-col gap-1.5">
            <Skeleton className="h-3 w-56 max-w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        {/* ステップ表示 */}
        <div className="mb-6 flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-1 items-center gap-2">
              <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
              {i < 3 && <Skeleton className="h-0.5 flex-1" />}
            </div>
          ))}
        </div>

        {/* 見出し */}
        <Skeleton className="mb-3 h-5 w-52 max-w-full" />

        {/* メニュー候補 */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-2 h-4 w-40 max-w-full" />
                  <Skeleton className="mt-2 h-3.5 w-full" />
                </div>
                <div className="shrink-0 text-right">
                  <Skeleton className="ml-auto h-4 w-16" />
                  <Skeleton className="ml-auto mt-2 h-3 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="pb-10 pt-4">
        <Skeleton className="mx-auto h-3 w-32" />
      </footer>
    </div>
  );
}
