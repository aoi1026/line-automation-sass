"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * ルートレイアウトごと差し替わる最終手段のエラー画面。
 * html/body を自前で出力する必要があり、スタイルシートが適用されない前提のため
 * すべてインラインスタイルで記述する。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 16px",
          backgroundColor: "#f9fafb",
          color: "#111827",
          fontFamily:
            '"Noto Sans JP", "Hiragino Sans", "Hiragino Kaku Gothic ProN", Meiryo, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            boxSizing: "border-box",
            padding: "40px 24px",
            textAlign: "center",
            backgroundColor: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "9999px",
              backgroundColor: "#fffbeb",
            }}
          >
            <AlertTriangle size={28} color="#f59e0b" aria-hidden="true" />
          </div>

          <h1 style={{ margin: "20px 0 0", fontSize: "18px", fontWeight: 700 }}>
            エラーが発生しました
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: "14px",
              lineHeight: 1.8,
              color: "#6b7280",
            }}
          >
            お手数ですが、もう一度お試しください。問題が続く場合は時間をおいてアクセスしてください。
          </p>

          {isDev && (
            <pre
              style={{
                margin: "20px 0 0",
                padding: "12px",
                textAlign: "left",
                fontSize: "12px",
                lineHeight: 1.7,
                color: "#4b5563",
                backgroundColor: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
              }}
            >
              {error.message}
              {error.digest ? `\n(digest: ${error.digest})` : ""}
            </pre>
          )}

          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "28px",
              padding: "10px 24px",
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: "inherit",
              color: "#ffffff",
              backgroundColor: "#06C755",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            再試行
          </button>
        </div>
      </body>
    </html>
  );
}
