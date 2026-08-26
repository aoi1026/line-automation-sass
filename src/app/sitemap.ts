import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/utils";

/**
 * 公開ページのサイトマップ。
 * 管理画面（/dashboard 配下）とお客様個別のトークンページ（/v/ /s/ /c/）は
 * 個人情報を含むため掲載しない。店舗ごとのWeb予約ページ（/r/[slug]）は
 * 店舗数が可変で、各店舗のQRコード・LINEから直接案内するため掲載しない。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getAppUrl().replace(/\/+$/, "");
  const lastModified = new Date();

  return [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
