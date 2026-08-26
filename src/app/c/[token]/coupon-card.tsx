import type { DiscountType } from "@prisma/client";
import { formatJstDate } from "@/lib/jst";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

/** 割引表示（PERCENT: 「10%OFF」 / AMOUNT: 「¥500 OFF」） */
export function formatDiscount(discountType: DiscountType, discountValue: number): string {
  return discountType === "PERCENT"
    ? `${discountValue}%OFF`
    : `¥${discountValue.toLocaleString("ja-JP")} OFF`;
}

/** 有効期間の表示文字列（一覧・詳細の「有効期間」列で使用） */
export function formatValidity(validFrom: Date | null, validUntil: Date | null): string {
  if (validFrom && validUntil) return `${formatJstDate(validFrom)} 〜 ${formatJstDate(validUntil)}`;
  if (validUntil) return `${formatJstDate(validUntil)}まで`;
  if (validFrom) return `${formatJstDate(validFrom)}から`;
  return "無期限";
}

/** 有効期限のみの表示（公開ページの「有効期限」欄で使用） */
function formatValidUntil(validUntil: Date | null): string {
  return validUntil ? formatJstDate(validUntil) : "無期限";
}

type CouponStatus = "active" | "used" | "expired" | "inactive" | "upcoming";

/** 状態ごとの案内バナー（利用できない理由を最初に伝える） */
const STATUS_NOTICE: Record<
  Exclude<CouponStatus, "active">,
  { text: string; className: string }
> = {
  used: {
    text: "このクーポンは使用済みです",
    className: "border-gray-300 bg-gray-100 text-gray-700",
  },
  expired: {
    text: "このクーポンは有効期限が過ぎています",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  upcoming: {
    text: "このクーポンはまだご利用いただけません",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
  inactive: {
    text: "このクーポンは現在ご利用いただけません",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
};

/**
 * クーポンカード（公開ページ /c/[token] と管理画面プレビューで共通の見た目）。
 * サーバーコンポーネントとして描画可能。
 */
export function CouponCard({
  storeName,
  title,
  description,
  discountType,
  discountValue,
  code,
  validFrom,
  validUntil,
  customerName,
  usedAt,
  inactive = false,
  now = new Date(),
}: {
  storeName: string;
  title: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  code: string;
  validFrom: Date | null;
  validUntil: Date | null;
  customerName?: string | null;
  usedAt?: Date | null;
  inactive?: boolean;
  now?: Date;
}) {
  const status: CouponStatus = usedAt
    ? "used"
    : validUntil && validUntil < now
      ? "expired"
      : validFrom && validFrom > now
        ? "upcoming"
        : inactive
          ? "inactive"
          : "active";

  const dimmed = status === "used" || status === "expired";
  const notice = status === "active" ? null : STATUS_NOTICE[status];
  const discountLabel = formatDiscount(discountType, discountValue);
  // 20文字まで入力できるため、長いコードは折り返しつつ字間を詰めて収める
  const codeClass =
    code.length > 12
      ? "text-xl tracking-[0.12em] sm:text-2xl"
      : "text-[1.75rem] tracking-[0.2em] sm:text-3xl sm:tracking-[0.3em]";

  return (
    <div>
      {notice && (
        <p
          className={cn(
            "mb-4 rounded-lg border px-4 py-3 text-center text-sm font-bold leading-relaxed",
            notice.className
          )}
        >
          {notice.text}
        </p>
      )}

      <div className="relative">
        <div
          className={cn(
            "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md",
            dimmed && "opacity-60 grayscale"
          )}
        >
          {/* 上部: ブランドグリーンのグラデーション */}
          <div className="bg-gradient-to-br from-brand to-brand-dark px-5 pb-7 pt-5 text-center text-white sm:px-6">
            <p className="truncate text-xs font-medium text-white/80">{storeName}</p>
            <p className="mt-4 break-words text-4xl font-extrabold leading-none tracking-tight sm:text-5xl">
              {discountLabel}
            </p>
            <p className="mt-3 text-balance text-lg font-bold leading-snug">{title}</p>
            {description && (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/90">
                {description}
              </p>
            )}
          </div>

          {/* ミシン目風の区切り（チケットの切り取り線） */}
          <div className="relative border-t-2 border-dashed border-gray-200">
            <span aria-hidden="true" className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-gray-50" />
            <span aria-hidden="true" className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-gray-50" />
          </div>

          {/* 下部: チケット半券 */}
          <div className="px-5 py-5 sm:px-6">
            <dl className="space-y-2 text-sm">
              {customerName && (
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="shrink-0 text-gray-500">宛名</dt>
                  <dd className="min-w-0 break-words text-right font-medium text-gray-900">
                    {customerName} 様
                  </dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3">
                <dt className="shrink-0 text-gray-500">有効期限</dt>
                <dd className="min-w-0 text-right font-medium text-gray-900">
                  {formatValidUntil(validUntil)}
                </dd>
              </div>
            </dl>

            {code && (
              <div className="mt-4">
                <p className="text-center text-xs font-medium text-gray-500">店頭確認コード</p>
                <p
                  className={cn(
                    "mt-1.5 break-all rounded-lg border-2 border-dashed border-brand/50 bg-brand-light/50 px-2 py-3 text-center font-mono font-bold text-brand-dark",
                    codeClass
                  )}
                >
                  {code}
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-col items-center gap-1.5 text-center">
              {status === "active" && <Badge>有効</Badge>}
              {status === "used" && <Badge variant="secondary">使用済み</Badge>}
              {status === "expired" && (
                <Badge variant="outline" className="border-red-300 text-red-600">
                  期限切れ
                </Badge>
              )}
              {status === "inactive" && <Badge variant="outline">無効</Badge>}
              {status === "upcoming" && (
                <Badge variant="outline" className="border-amber-300 text-amber-700">
                  利用開始前
                </Badge>
              )}
              {status === "upcoming" && validFrom && (
                <p className="text-xs text-gray-500">
                  {formatJstDate(validFrom)}からご利用いただけます
                </p>
              )}

              {status === "used" && usedAt && (
                <p className="text-xs text-gray-500">利用日: {formatJstDate(usedAt)}</p>
              )}
            </div>
          </div>

          {/* 案内 */}
          {status === "active" && (
            <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 text-center text-xs leading-relaxed text-gray-600">
              ご来店時にこの画面をスタッフにご提示ください
            </div>
          )}
        </div>

        {/* 使用済み・期限切れは遠目でも分かるようにスタンプを重ねる */}
        {dimmed && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span
              className={cn(
                "-rotate-12 rounded-xl border-4 bg-white/85 px-6 py-2 text-3xl font-extrabold tracking-widest shadow-sm",
                status === "used" ? "border-gray-500 text-gray-600" : "border-red-500 text-red-600"
              )}
            >
              {status === "used" ? "使用済み" : "期限切れ"}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
