import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/utils";

/**
 * クローラー向けの robots.txt。
 * 管理画面・API・お客様個別のトークンページ（/v/ /s/ /c/）は
 * 個人情報を含むため必ずクロール対象から除外する。
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppUrl().replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/r/"],
        disallow: ["/dashboard", "/api/", "/v/", "/s/", "/c/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
