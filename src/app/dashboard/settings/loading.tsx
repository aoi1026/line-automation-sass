import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** タブ列の見出し幅（店舗情報・営業時間・メニュー・スタッフ・LINE連携） */
const TAB_WIDTHS = ["w-20", "w-20", "w-16", "w-16", "w-20"];

/** 設定ページの読み込み中表示 */
export default function SettingsLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">読み込み中です</span>

      {/* PageHeader */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-20" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </div>
      </div>

      {/* タブ列 */}
      <div className="overflow-x-auto pb-1">
        <div className="inline-flex h-10 items-center gap-1 rounded-lg bg-gray-100 p-1">
          {TAB_WIDTHS.map((width, i) => (
            <Skeleton
              key={i}
              className={`h-8 rounded-md bg-gray-300/70 ${width}`}
            />
          ))}
        </div>
      </div>

      {/* フォーム */}
      <div className="mt-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-1 h-3.5 w-72 max-w-full" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* 2列（店舗名・電話番号） */}
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>

            {/* 1列（住所） */}
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>

            {/* テキストエリア（紹介文） */}
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>

            {/* 2列（予約枠の間隔・再来店のご案内間隔） */}
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-28 rounded-lg" />
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
