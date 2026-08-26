import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Toaster } from "sonner";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} | ${APP_TAGLINE}`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "美容室・ネイルサロン・エステサロンのためのLINE顧客リピート自動化サービス。予約確認・リマインダー・来店お礼・再来店案内をすべて自動で。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
