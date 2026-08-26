import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

/** メッセージ履歴ページの読み込み中表示 */
export default function MessagesLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">読み込み中です</span>

      {/* PageHeader */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </div>
      </div>

      {/* KPI 4枚 */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-start justify-between gap-3 p-5">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-2.5 h-7 w-16" />
                <Skeleton className="mt-2 h-3 w-12" />
              </div>
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-5">
          {/* 絞り込み（種別・ステータス・チャネル） */}
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-10 w-full rounded-lg sm:w-44" />
            <Skeleton className="h-10 w-full rounded-lg sm:w-44" />
            <Skeleton className="h-10 w-full rounded-lg sm:w-40" />
          </div>

          {/* デスクトップ: テーブル */}
          <div className="mt-4 hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>送信日時</TableHead>
                  <TableHead>顧客</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>チャネル</TableHead>
                  <TableHead>ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-20 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-56 max-w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* モバイル: カード */}
          <div className="mt-4 space-y-3 sm:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-gray-100 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="ml-auto h-3 w-16 shrink-0" />
                </div>
                <Skeleton className="mt-2 h-4 w-28" />
                <Skeleton className="mt-1.5 h-4 w-full" />
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
