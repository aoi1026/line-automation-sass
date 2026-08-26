import type { Metadata } from "next";
import { TicketX } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { CouponCard } from "./coupon-card";
import { RedeemSection } from "./redeem-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "クーポン",
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
              <TicketX className="h-12 w-12 text-gray-300" />
              <h1 className="mt-2 text-lg font-bold text-gray-900">
                クーポンが見つかりませんでした
              </h1>
              <p className="text-sm text-gray-500">
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
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-md items-center justify-center px-4">
          <span className="truncate text-base font-bold text-gray-900">{coupon.store.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-8">
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

        {redeemable && <RedeemSection token={issue.token} />}

        <p className="mt-8 text-center text-xs text-gray-400">{coupon.store.name}</p>
      </main>
    </div>
  );
}
