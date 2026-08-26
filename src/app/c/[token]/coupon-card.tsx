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

type CouponStatus = "active" | "used" | "expired" | "inactive";

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
      : inactive
        ? "inactive"
        : "active";

  const dimmed = status === "used" || status === "expired";

  return (
    <div>
      {status === "inactive" && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-800">
          このクーポンは現在ご利用いただけません
        </div>
      )}

      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md",
          dimmed && "opacity-70 grayscale-[0.6]"
        )}
      >
        {/* 上部: ブランドグリーンのグラデーション */}
        <div className="bg-gradient-to-br from-brand to-brand-dark px-6 pb-7 pt-5 text-center text-white">
          <p className="text-xs font-medium text-white/80">{storeName}</p>
          <p className="mt-4 text-5xl font-extrabold tracking-tight">
            {formatDiscount(discountType, discountValue)}
          </p>
          <p className="mt-3 text-lg font-bold">{title}</p>
          {description && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/90">
              {description}
            </p>
          )}
        </div>

        {/* ミシン目風の区切り（チケットの切り取り線） */}
        <div className="relative border-t-2 border-dashed border-gray-200">
          <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-gray-50" />
          <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-gray-50" />
        </div>

        {/* 下部: チケット半券 */}
        <div className="px-6 py-5">
          <dl className="space-y-2 text-sm">
            {customerName && (
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-gray-500">宛名</dt>
                <dd className="font-medium text-gray-900">{customerName} 様</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-gray-500">有効期限</dt>
              <dd className="font-medium text-gray-900">{formatValidUntil(validUntil)}</dd>
            </div>
          </dl>

          {code && (
            <div className="mt-4">
              <p className="text-center text-xs font-medium text-gray-500">店頭確認コード</p>
              <p className="mt-1.5 rounded-lg border-2 border-dashed border-brand/50 bg-brand-light/50 py-3 text-center font-mono text-2xl font-bold tracking-[0.3em] text-brand-dark">
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

            {status === "used" && usedAt && (
              <p className="text-xs text-gray-500">利用日: {formatJstDate(usedAt)}</p>
            )}
          </div>
        </div>

        {/* 案内 */}
        {status === "active" && (
          <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 text-center text-xs text-gray-600">
            ご来店時にこの画面をスタッフにご提示ください
          </div>
        )}
      </div>
    </div>
  );
}
