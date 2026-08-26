import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * 全レスポンスに付与する共通セキュリティヘッダ。
 *
 * Content-Security-Policy は意図的に設定していません。
 * Next.js App Router はハイドレーション用のインラインスクリプトを出力するため、
 * nonce を全ページに行き渡らせない限り script-src と競合し、
 * 設定を誤るとアプリ全体が動作しなくなるリスクがあります。
 * 導入する場合は nonce をミドルウェアで発行する仕組みとセットで検討してください。
 */
const securityHeaders = [
  // クリックジャッキング対策（同一オリジン以外でのフレーム埋め込みを禁止）
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // MIMEタイプの推測を無効化
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 外部サイトへはオリジンのみを送信
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 不要なブラウザ機能を無効化
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // DNSプリフェッチを許可（表示速度の改善）
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

if (isProduction) {
  // HTTPS強制（本番のみ。ローカル開発のhttpアクセスを壊さないため）
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@line/bot-sdk"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
