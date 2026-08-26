import Link from "next/link";
import { MessageCircleHeart } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-light via-white to-gray-50 px-4 py-12 text-center">
      <div className="flex items-center gap-2">
        <MessageCircleHeart className="h-7 w-7 text-brand" />
        <span className="text-xl font-bold text-gray-900">{APP_NAME}</span>
      </div>
      <p className="mt-10 text-6xl font-bold tracking-tight text-brand">404</p>
      <h1 className="mt-4 text-xl font-semibold text-gray-900">ページが見つかりません</h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-600">
        お探しのページは移動または削除された可能性があります。URLをご確認のうえ、トップページからやり直してください。
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={cn(buttonVariants())}>
          トップページへ戻る
        </Link>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
          ダッシュボードへ
        </Link>
      </div>
    </main>
  );
}
