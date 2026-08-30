import type { Metadata } from "next";
import { Info, TicketX } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { CouponCard } from "./coupon-card";

export const dynamic = "force-dynamic";

/**
 * お客様ごとの個別URLのため、検索エンジンには一切登録させない。
 * （robots.ts でもクロールを禁止しているが、meta でも二重に指定する）
 */
export const metadata: Metadata = {
  title: "クーポン",
  description: "お客様限定のクーポンです。ご来店時にスタッフへご提示ください。",
  robots: { index: false, follow: false, nocache: true },
};

export default async function PublicCouponPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const issue = await prisma.couponIssue.findUnique({
    where: { token },
    include: {
      coupon: { include: { store: true } },
      customer: true,
    },
  });

  if (!issue) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-md">
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
              <TicketX aria-hidden="true" className="h-12 w-12 text-gray-300" />
              <h1 className="mt-2 text-lg font-bold text-gray-900">
                クーポンが見つかりませんでした
              </h1>
              <p className="text-sm leading-relaxed text-gray-500">
                URLが正しいかご確認のうえ、もう一度お試しください。
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { coupon, customer } = issue;
  const now = new Date();
  const expired = Boolean(coupon.validUntil && coupon.validUntil < now);
  const notYetValid = Boolean(coupon.validFrom && coupon.validFrom > now);
  const redeemable = coupon.active && !issue.usedAt && !expired && !notYetValid;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-1.5 bg-brand" />
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-md items-center justify-center px-4">
          <span className="truncate text-base font-bold text-gray-900">{coupon.store.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-8">
        <h1 className="sr-only">
          {coupon.store.name}のクーポン「{coupon.title}」
        </h1>

        <CouponCard
          storeName={coupon.store.name}
          title={coupon.title}
          description={coupon.description}
          discountType={coupon.discountType}
          discountValue={coupon.discountValue}
          code={coupon.code}
          validFrom={coupon.validFrom}
          validUntil={coupon.validUntil}
          customerName={customer.name}
          usedAt={issue.usedAt}
          inactive={!coupon.active}
          now={now}
        />

        {/*
          使用済みへの変更は店舗スタッフが管理画面から行う。
          お客様の端末から消し込めるとご自身で使用済みにできてしまうため、
          公開ページでは提示のご案内のみを表示する。
        */}
        {redeemable && (
          <div className="mt-4 space-y-3">
            <p className="text-center text-xs leading-relaxed text-gray-500">
              画面の明るさを上げてご提示いただくと、スタッフが確認しやすくなります。
            </p>
            <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <p className="text-xs leading-relaxed text-gray-600">
                クーポンを使用済みにする手続きは、ご来店時に店舗スタッフが行います。お客様ご自身での操作は必要ありません。
              </p>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">{coupon.store.name}</p>
      </main>
    </div>
  );
}
