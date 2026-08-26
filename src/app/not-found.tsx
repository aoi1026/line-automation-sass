import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircleHeart } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "ページが見つかりません",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-light via-white to-gray-50 px-4 py-12 text-center">
      <Link
        href="/"
        aria-label={`${APP_NAME} トップページへ`}
        className="flex items-center gap-2 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        <MessageCircleHeart aria-hidden="true" className="h-7 w-7 shrink-0 text-brand" />
        <span className="text-xl font-bold text-gray-900">{APP_NAME}</span>
      </Link>

      <p aria-hidden="true" className="mt-10 text-6xl font-bold tracking-tight text-brand">
        404
      </p>
      <h1 className="mt-4 text-xl font-semibold text-gray-900">ページが見つかりません</h1>
      <p className="mt-2 max-w-md text-pretty text-sm leading-relaxed text-gray-600">
        お探しのページは移動または削除された可能性があります。
        URLをご確認のうえ、トップページからやり直してください。
      </p>

      <div className="mt-8 flex w-full max-w-xs flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:justify-center">
        <Link href="/" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
          トップページへ戻る
        </Link>
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "w-full sm:w-auto"
          )}
        >
          管理画面へ
        </Link>
      </div>

      <p className="mt-8 max-w-md text-pretty text-xs leading-relaxed text-gray-500">
        ご予約の確認・クーポン・アンケートのURLをお開きの場合は、受付が終了している可能性があります。
        お手数ですが、店舗までお問い合わせください。
      </p>
    </main>
  );
}
