import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** 通知センターの読み込み中表示 */
export default function NotificationsLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">読み込み中です</span>

      {/* PageHeader（すべて既読にするボタン付き） */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-36" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40 shrink-0 rounded-lg" />
      </div>

      <Card>
        <CardContent className="pt-5">
          {/* 絞り込みタブ（すべて / 未読） */}
          <div className="inline-flex h-10 items-center gap-1 rounded-lg bg-gray-100 p-1">
            <Skeleton className="h-8 w-20 rounded-md bg-gray-300/70" />
            <Skeleton className="h-8 w-24 rounded-md bg-gray-300/70" />
          </div>

          {/* 通知一覧 */}
          <div className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3 px-4 py-3.5">
                <Skeleton className="mt-2 h-2 w-2 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="ml-auto h-3 w-14 shrink-0" />
                  </div>
                  <Skeleton className="mt-2 h-4 w-52 max-w-full" />
                  <Skeleton className="mt-1.5 h-3.5 w-72 max-w-full" />
                </div>
              </div>
            ))}
          </div>

          {/* ページ送り */}
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <Skeleton className="h-3 w-44" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
