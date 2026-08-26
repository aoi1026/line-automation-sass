import { ImageResponse } from "next/og";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

/**
 * SNS共有時に表示されるOGP画像（1200x630）。
 *
 * フォントは外部から取得せず、next/og に同梱された既定フォントのみを使う。
 * ビルド環境のネットワーク状態に左右されないよう、
 * ロゴマークは文字ではなく図形（div）だけで組み立てている。
 */

export const alt = APP_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BRAND = "#06C755";
const BRAND_DARK = "#05A648";

const FEATURES = ["LINE自動配信", "Web予約", "顧客カルテ", "クーポン・アンケート"];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundImage:
            "linear-gradient(160deg, #FFFFFF 0%, #F4FCF7 55%, #DDF5E6 100%)",
        }}
      >
        {/* 上部のブランドライン */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            display: "flex",
            width: size.width,
            height: 14,
            backgroundColor: BRAND,
          }}
        />

        {/* ロゴマーク（吹き出し） */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 34,
            backgroundColor: BRAND,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 80,
              height: 56,
              borderRadius: 28,
              backgroundColor: "#FFFFFF",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 33,
              top: 71,
              display: "flex",
              width: 24,
              height: 24,
              borderRadius: 5,
              backgroundColor: "#FFFFFF",
              transform: "rotate(45deg)",
            }}
          />
        </div>

        {/* サービス名 */}
        <div
          style={{
            display: "flex",
            marginTop: 38,
            fontSize: 92,
            lineHeight: 1.2,
            fontWeight: 700,
            letterSpacing: -2,
            color: "#111827",
          }}
        >
          {APP_NAME}
        </div>

        {/* タグライン */}
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 38,
            lineHeight: 1.4,
            fontWeight: 700,
            color: BRAND_DARK,
          }}
        >
          {APP_TAGLINE}
        </div>

        {/* サービス説明 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 22,
            fontSize: 25,
            lineHeight: 1.6,
            textAlign: "center",
            color: "#4B5563",
          }}
        >
          <div style={{ display: "flex" }}>美容室・ネイルサロン・エステサロンのための、</div>
          <div style={{ display: "flex" }}>予約管理とLINE配信をひとつにしたリピート自動化サービス</div>
        </div>

        {/* 主要機能 */}
        <div style={{ display: "flex", marginTop: 38, gap: 16 }}>
          {FEATURES.map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 52,
                padding: "0 24px",
                borderRadius: 999,
                border: `2px solid ${BRAND}`,
                backgroundColor: "#FFFFFF",
                fontSize: 22,
                lineHeight: 1.4,
                fontWeight: 500,
                color: BRAND_DARK,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
