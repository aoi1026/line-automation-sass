import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** アンケート回答ページの読み込み中表示 */
export default function PublicSurveyLoading() {
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
        <Card>
          <CardContent className="p-5">
            {/* アンケートのタイトル・説明 */}
            <Skeleton className="h-6 w-48 max-w-full" />
            <Skeleton className="mt-3 h-3.5 w-full" />
            <Skeleton className="mt-1.5 h-3.5 w-4/5" />

            {/* 評価質問（星5つ） */}
            <div className="mt-6">
              <Skeleton className="h-4 w-56 max-w-full" />
              <div className="mt-3 flex items-center justify-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-9 rounded-md" />
                ))}
              </div>
            </div>

            {/* 選択式・自由記述の質問 */}
            <div className="mt-6 flex flex-col gap-6">
              <div>
                <Skeleton className="h-4 w-44 max-w-full" />
                <div className="mt-3 flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full rounded-lg" />
                  ))}
                </div>
              </div>
              <div>
                <Skeleton className="h-4 w-52 max-w-full" />
                <Skeleton className="mt-3 h-24 w-full rounded-lg" />
              </div>
            </div>

            {/* 送信ボタン */}
            <Skeleton className="mt-6 h-12 w-full rounded-lg" />
          </CardContent>
        </Card>

        <Skeleton className="mx-auto mt-8 h-3 w-32" />
      </main>
    </div>
  );
}
