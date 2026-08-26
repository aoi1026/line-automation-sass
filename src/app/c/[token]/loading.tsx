import { Skeleton } from "@/components/ui/skeleton";

/** クーポンページの読み込み中表示 */
export default function PublicCouponLoading() {
  return (
    <div className="min-h-screen bg-gray-50" role="status" aria-live="polite">
      <span className="sr-only">読み込み中です</span>

      {/* ヘッダー（店舗名） */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-md items-center justify-center px-4">
          <Skeleton className="h-5 w-40" />
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-8">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
          {/* 上部: 割引の見せ場 */}
          <div className="bg-gray-100 px-6 pb-7 pt-5 text-center">
            <Skeleton className="mx-auto h-3 w-24 bg-gray-300/70" />
            <Skeleton className="mx-auto mt-4 h-12 w-40 bg-gray-300/70" />
            <Skeleton className="mx-auto mt-3 h-5 w-48 max-w-full bg-gray-300/70" />
            <Skeleton className="mx-auto mt-2 h-3.5 w-56 max-w-full bg-gray-300/70" />
          </div>

          {/* ミシン目風の区切り */}
          <div className="relative border-t-2 border-dashed border-gray-200">
            <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-gray-50" />
            <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-gray-50" />
          </div>

          {/* 下部: 宛名・有効期限・確認コード */}
          <div className="px-6 py-5">
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex items-baseline justify-between gap-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Skeleton className="mx-auto h-3 w-24" />
              <Skeleton className="mt-1.5 h-12 w-full rounded-lg" />
            </div>

            <div className="mt-4 flex justify-center">
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>

        {/* クーポンを使うボタン */}
        <Skeleton className="mt-6 h-12 w-full rounded-lg" />

        <Skeleton className="mx-auto mt-8 h-3 w-32" />
      </main>
    </div>
  );
}
