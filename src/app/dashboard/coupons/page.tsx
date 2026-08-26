import type { Metadata } from "next";
import { Percent, Plus, Send, Ticket, TicketCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { fromJst, jstParts, jstYmd } from "@/lib/jst";
import { formatNumber, formatPercent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { formatDiscount, formatValidity } from "@/app/c/[token]/coupon-card";
import { CouponFormDialog } from "./_components/coupon-form-dialog";
import { CouponsTable, type CouponRow } from "./_components/coupons-table";

export const metadata: Metadata = { title: "クーポン" };

function monthStartJst(year: number, month: number) {
  return fromJst(`${year}-${String(month).padStart(2, "0")}-01`);
}

export default async function CouponsPage() {
  const session = await requireSession();

  const now = new Date();
  const { year, month } = jstParts(now);
  const monthStart = monthStartJst(year, month);
  const nextMonthStart = month === 12 ? monthStartJst(year + 1, 1) : monthStartJst(year, month + 1);

  const [coupons, usedCounts, activeCount, monthlyIssued, monthlyUsed, totalIssued, totalUsed] =
    await Promise.all([
      prisma.coupon.findMany({
        where: { storeId: session.storeId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { issues: true } } },
      }),
      prisma.couponIssue.groupBy({
        by: ["couponId"],
        where: { coupon: { storeId: session.storeId }, usedAt: { not: null } },
        _count: { _all: true },
      }),
      prisma.coupon.count({ where: { storeId: session.storeId, active: true } }),
      prisma.couponIssue.count({
        where: { coupon: { storeId: session.storeId }, issuedAt: { gte: monthStart, lt: nextMonthStart } },
      }),
      prisma.couponIssue.count({
        where: { coupon: { storeId: session.storeId }, usedAt: { gte: monthStart, lt: nextMonthStart } },
      }),
      prisma.couponIssue.count({ where: { coupon: { storeId: session.storeId } } }),
      prisma.couponIssue.count({
        where: { coupon: { storeId: session.storeId }, usedAt: { not: null } },
      }),
    ]);

  const usedMap = new Map(usedCounts.map((u) => [u.couponId, u._count._all]));
  const usageRate = totalIssued > 0 ? totalUsed / totalIssued : null;

  const rows: CouponRow[] = coupons.map((coupon) => ({
    id: coupon.id,
    title: coupon.title,
    discountLabel: formatDiscount(coupon.discountType, coupon.discountValue),
    code: coupon.code,
    validityLabel: formatValidity(coupon.validFrom, coupon.validUntil),
    issuedCount: coupon._count.issues,
    usageLimit: coupon.usageLimit,
    usedCount: usedMap.get(coupon.id) ?? 0,
    active: coupon.active,
    editInitial: {
      title: coupon.title,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      code: coupon.code,
      validFrom: coupon.validFrom ? jstYmd(coupon.validFrom) : "",
      validUntil: coupon.validUntil ? jstYmd(coupon.validUntil) : "",
      usageLimit: coupon.usageLimit,
    },
  }));

  return (
    <>
      <PageHeader
        title="クーポン"
        description="お客様に配布するクーポンを管理します。自動配信やキャンペーンに添付できます。"
        actions={
          <CouponFormDialog
            trigger={
              <Button>
                <Plus />
                クーポンを作成
              </Button>
            }
          />
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="有効なクーポン" value={`${formatNumber(activeCount)}件`} icon={<Ticket />} />
        <StatCard label="今月の発行数" value={`${formatNumber(monthlyIssued)}件`} icon={<Send />} />
        <StatCard
          label="今月の利用数"
          value={`${formatNumber(monthlyUsed)}件`}
          icon={<TicketCheck />}
        />
        <StatCard
          label="利用率"
          value={usageRate === null ? "—" : formatPercent(usageRate)}
          sub={usageRate === null ? "発行実績がありません" : "累計の利用数 ÷ 発行数"}
          icon={<Percent />}
        />
      </div>

      <CouponsTable rows={rows} />
    </>
  );
}
