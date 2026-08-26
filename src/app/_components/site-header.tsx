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
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <MessageCircleHeart className="h-7 w-7 text-brand" />
          <span className="text-lg font-bold tracking-tight text-gray-900">{APP_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-dark"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {loggedIn ? (
            <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
              ダッシュボードへ
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
              >
                ログイン
              </Link>
              <Link href="/register" className={buttonVariants({ size: "sm" })}>
                無料で始める
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
