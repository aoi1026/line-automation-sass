import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Percent, Ticket, TicketCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { formatJstDateTime, jstYmd } from "@/lib/jst";
import { formatNumber, formatPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CouponCard } from "@/app/c/[token]/coupon-card";
import { CouponFormDialog } from "../_components/coupon-form-dialog";
import { DeleteCouponButton } from "../_components/delete-coupon-button";
import { RedeemButton } from "../_components/redeem-button";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "クーポン詳細" };

export default async function CouponDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const coupon = await prisma.coupon.findFirst({
    where: { id, storeId: session.storeId },
    include: {
      store: true,
      issues: { orderBy: { issuedAt: "desc" }, include: { customer: true } },
    },
  });
  if (!coupon) notFound();

  const issuedCount = coupon.issues.length;
  const usedCount = coupon.issues.filter((issue) => issue.usedAt !== null).length;
  const usageRate = issuedCount > 0 ? usedCount / issuedCount : null;

  return (
    <>
      <PageHeader
        title={coupon.title}
        description="クーポンの発行状況を確認できます。"
        actions={
          <div className="flex items-center gap-2">
            <CouponFormDialog
              couponId={coupon.id}
              initial={{
                title: coupon.title,
                description: coupon.description,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                code: coupon.code,
                validFrom: coupon.validFrom ? jstYmd(coupon.validFrom) : "",
                validUntil: coupon.validUntil ? jstYmd(coupon.validUntil) : "",
                usageLimit: coupon.usageLimit,
              }}
              trigger={
                <Button type="button" variant="outline">
                  <Pencil />
                  編集
                </Button>
              }
            />
            <DeleteCouponButton couponId={coupon.id} couponTitle={coupon.title} />
          </div>
        }
      />

      <div className="flex flex-col gap-6">
        {/* クーポン概要（チケットプレビュー） */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">プレビュー</CardTitle>
            <CardDescription>お客様に届くクーポン表示ページと同じ見た目です。</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mx-auto max-w-sm rounded-xl bg-gray-50 p-4 sm:p-6">
              <CouponCard
                storeName={coupon.store.name}
                title={coupon.title}
                description={coupon.description}
                discountType={coupon.discountType}
                discountValue={coupon.discountValue}
                code={coupon.code}
                validFrom={coupon.validFrom}
                validUntil={coupon.validUntil}
                customerName="◯◯"
                inactive={!coupon.active}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="発行数" value={`${formatNumber(issuedCount)}件`} icon={<Ticket />} />
          <StatCard label="利用数" value={`${formatNumber(usedCount)}件`} icon={<TicketCheck />} />
          <StatCard
            label="利用率"
            value={usageRate === null ? "—" : formatPercent(usageRate)}
            icon={<Percent />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">発行履歴</CardTitle>
            <CardDescription>
              来店時にコードを確認したら「使用済みにする」を押してください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            {coupon.issues.length === 0 ? (
              <EmptyState
                icon={<Ticket />}
                title="まだ発行されていません"
                description="来店お礼・誕生日メッセージなどの自動配信やキャンペーンにこのクーポンを添付すると、送信時に発行されます。"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>顧客名</TableHead>
                    <TableHead>発行日</TableHead>
                    <TableHead>利用日</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupon.issues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/customers/${issue.customerId}`}
                          className="font-medium text-gray-900 hover:text-brand-dark hover:underline"
                        >
                          {issue.customer.name}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-gray-600">
                        {formatJstDateTime(issue.issuedAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {issue.usedAt ? (
                          <span className="text-gray-600">{formatJstDateTime(issue.usedAt)}</span>
                        ) : (
                          <Badge variant="outline">未使用</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {issue.usedAt ? (
                          <RedeemButton issueId={issue.id} action="unredeem" />
                        ) : (
                          <RedeemButton issueId={issue.id} action="redeem" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
