import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Toaster } from "sonner";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { getAppUrl } from "@/lib/utils";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

const DESCRIPTION =
  "美容室・ネイルサロン・エステサロンのためのLINE顧客リピート自動化サービス。予約確認・前日リマインド・来店お礼・再来店のご案内までLINEで自動配信し、Web予約・顧客カルテ・クーポン・アンケートまで一つの画面で管理できます。";

const OG_DESCRIPTION =
  "予約確認・リマインド・来店お礼・再来店のご案内までLINEで自動。スタッフの手を止めずに、リピーターを増やします。";

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: {
    default: `${APP_NAME} | ${APP_TAGLINE}`,
    template: `%s | ${APP_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    "LINE",
    "LINE公式アカウント",
    "予約管理",
    "ネット予約",
    "美容室",
    "ヘアサロン",
    "ネイルサロン",
    "エステサロン",
    "リピート",
    "再来店",
    "顧客管理",
    "顧客カルテ",
    "リマインド",
    "サロン集客",
    "販促自動化",
  ],
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: APP_NAME,
    title: `${APP_NAME} | ${APP_TAGLINE}`,
    description: OG_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} | ${APP_TAGLINE}`,
    description: OG_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06C755",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={notoSansJp.variable}>
      <body className="font-sans">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
