import Link from "next/link";
import { MessageCircleHeart } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const FOOTER_LINKS: { href: string; label: string }[] = [
  { href: "#features", label: "機能" },
  { href: "#how", label: "使い方" },
  { href: "#faq", label: "よくある質問" },
];

/** ランディングページのフッター */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <MessageCircleHeart className="h-6 w-6 text-brand" />
              <span className="text-base font-bold tracking-tight text-gray-900">{APP_NAME}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              {APP_TAGLINE}
              <br />
              美容室・ネイルサロン・エステサロンのための、LINE顧客リピート自動化サービスです。
            </p>
          </div>

          <div className="flex gap-12 sm:gap-16">
            <div>
              <p className="text-xs font-bold tracking-wide text-gray-900">サービス</p>
              <ul className="mt-3 space-y-2">
                {FOOTER_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-sm text-gray-600 transition-colors hover:text-brand-dark"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold tracking-wide text-gray-900">ご利用</p>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link
                    href="/login"
                    className="text-sm text-gray-600 transition-colors hover:text-brand-dark"
                  >
                    ログイン
                  </Link>
                </li>
                <li>
                  <Link
                    href="/register"
                    className="text-sm text-gray-600 transition-colors hover:text-brand-dark"
                  >
                    新規登録
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-10 border-t border-gray-100 pt-6 text-xs text-gray-500">
          © {year} {APP_NAME}
        </p>
      </div>
    </footer>
  );
}
