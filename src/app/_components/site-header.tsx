import Link from "next/link";
import { MessageCircleHeart } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS: { href: string; label: string }[] = [
  { href: "#features", label: "機能" },
  { href: "#how", label: "使い方" },
  { href: "#faq", label: "よくある質問" },
];

/** ランディングページの固定ヘッダー（モバイルではCTAのみ表示） */
export function SiteHeader({ loggedIn }: { loggedIn: boolean }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200/80 bg-white/90 backdrop-blur">
      {/* キーボード操作時のみ表示されるスキップリンク */}
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:left-4 focus-visible:top-3 focus-visible:z-50 focus-visible:rounded-lg focus-visible:bg-brand focus-visible:px-4 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        本文へスキップ
      </a>

      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label={`${APP_NAME} トップページ`}
          className="flex min-w-0 items-center gap-2 rounded-lg py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          <MessageCircleHeart aria-hidden="true" className="h-7 w-7 shrink-0 text-brand" />
          <span className="truncate text-lg font-bold tracking-tight text-gray-900">
            {APP_NAME}
          </span>
        </Link>

        <nav aria-label="サイト内メニュー" className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-1 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {loggedIn ? (
            <Link
              href="/dashboard"
              className={cn(buttonVariants({ size: "sm" }), "h-11 px-4 text-sm")}
            >
              ダッシュボードへ
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "hidden h-11 px-4 text-sm sm:inline-flex"
                )}
              >
                ログイン
              </Link>
              <Link
                href="/register"
                className={cn(buttonVariants({ size: "sm" }), "h-11 px-4 text-sm")}
              >
                無料で始める
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
