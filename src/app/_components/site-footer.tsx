import Link from "next/link";
import { MessageCircleHeart } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const FOOTER_LINKS: { href: string; label: string }[] = [
  { href: "#features", label: "機能" },
  { href: "#how", label: "使い方" },
  { href: "#faq", label: "よくある質問" },
];

const LINK_CLASS =
  "-mx-1 inline-block rounded-md px-1 py-1.5 text-sm text-gray-600 transition-colors hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50";

/** ランディングページのフッター */
export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <MessageCircleHeart aria-hidden="true" className="h-6 w-6 shrink-0 text-brand" />
              <span className="text-base font-bold tracking-tight text-gray-900">{APP_NAME}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              {APP_TAGLINE}
              <br />
              美容室・ネイルサロン・エステサロンのための、LINE顧客リピート自動化サービスです。
            </p>
          </div>

          <div className="flex gap-10 sm:gap-16">
            <nav aria-labelledby="footer-service">
              <p id="footer-service" className="text-xs font-bold tracking-wide text-gray-900">
                サービス
              </p>
              <ul className="mt-3 space-y-1">
                {FOOTER_LINKS.map((link) => (
                  <li key={link.href}>
                    <a href={link.href} className={LINK_CLASS}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-labelledby="footer-account">
              <p id="footer-account" className="text-xs font-bold tracking-wide text-gray-900">
                ご利用
              </p>
              <ul className="mt-3 space-y-1">
                <li>
                  <Link href="/login" className={LINK_CLASS}>
                    ログイン
                  </Link>
                </li>
                <li>
                  <Link href="/register" className={LINK_CLASS}>
                    新規登録
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <p className="mt-10 border-t border-gray-100 pt-6 text-xs text-gray-500">
          © {year} {APP_NAME}
        </p>
      </div>
    </footer>
  );
}
