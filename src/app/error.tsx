"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** アプリ全体（公開ページ・ログイン等）のエラー画面 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center px-6 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </div>
          <h1 className="mt-5 text-lg font-bold text-gray-900">エラーが発生しました</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">
            お手数ですが、もう一度お試しください。問題が続く場合は時間をおいてアクセスしてください。
          </p>

          {isDev && (
            <pre className="mt-5 w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-gray-50 p-3 text-left text-xs leading-relaxed text-gray-600">
              {error.message}
              {error.digest ? `\n(digest: ${error.digest})` : ""}
            </pre>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => reset()}>
              <RotateCcw />
              再試行
            </Button>
            <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
              トップページに戻る
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
