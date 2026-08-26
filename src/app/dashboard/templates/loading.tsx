import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** 種別ごとのセクションに並べるカード枚数 */
const SECTION_CARD_COUNTS = [3, 2, 2];

/** テンプレートページの読み込み中表示 */
export default function TemplatesLoading() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">読み込み中です</span>

      {/* PageHeader（テンプレートを作成ボタン付き） */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-44 shrink-0 rounded-lg" />
      </div>

      {/* 種別ごとのセクション */}
      <div className="flex flex-col gap-8">
        {SECTION_CARD_COUNTS.map((cardCount, sectionIndex) => (
          <section key={sectionIndex}>
            <div className="mb-3 flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-8" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: cardCount }).map((_, cardIndex) => (
                <Card key={cardIndex} className="flex flex-col">
                  <CardContent className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Skeleton className="h-4 w-32 max-w-full" />
                        <Skeleton className="mt-2 h-5 w-28 rounded-full" />
                      </div>
                      <Skeleton className="h-6 w-11 shrink-0 rounded-full" />
                    </div>
                    <div>
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="mt-1.5 h-3.5 w-4/5" />
                    </div>
                    <Skeleton className="h-3 w-28" />
                    <div className="mt-auto flex items-center gap-2 pt-1">
                      <Skeleton className="h-8 w-16 rounded-md" />
                      <Skeleton className="h-8 w-16 rounded-md" />
                      <Skeleton className="h-8 w-16 rounded-md" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
