import type { MetadataRoute } from "next";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

/**
 * PWAマニフェスト。スマートフォンのホーム画面に追加した際に
 * 管理画面（/dashboard）が単独アプリとして起動する。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP_NAME}｜${APP_TAGLINE}`,
    short_name: APP_NAME,
    description:
      "美容室・ネイルサロン・エステサロンのためのLINE顧客リピート自動化サービス。予約・顧客管理からLINE配信までスマートフォンひとつで。",
    lang: "ja",
    dir: "ltr",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#06C755",
    categories: ["business", "productivity"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
