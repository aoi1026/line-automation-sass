import type { Metadata } from "next";
import { MessageCircle, Plus, Sparkles, Users } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { formatJstDate, fromJst, jstParts } from "@/lib/jst";
import { formatNumber, formatYen } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { CustomerFormDialog } from "./_components/customer-form-dialog";
import { CustomersTable, type CustomerRow } from "./_components/customers-table";
import { CustomersToolbar } from "./_components/customers-toolbar";

export const metadata: Metadata = { title: "顧客管理" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const tagId = (params.tag ?? "").trim();

  const now = new Date();
  const { year, month } = jstParts(now);
  const monthStart = fromJst(`${year}-${String(month).padStart(2, "0")}-01`);

  const where: Prisma.CustomerWhereInput = {
    storeId: session.storeId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { kana: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
    ...(tagId ? { tags: { some: { tagId } } } : {}),
  };

  const [customers, tags, totalCount, lineCount, newThisMonth] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: { tags: { include: { tag: true } } },
      orderBy: [{ lastVisitAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    }),
    prisma.tag.findMany({
      where: { storeId: session.storeId },
      orderBy: { name: "asc" },
    }),
    prisma.customer.count({ where: { storeId: session.storeId } }),
    prisma.customer.count({
      where: { storeId: session.storeId, lineUserId: { not: null } },
    }),
    prisma.customer.count({
      where: { storeId: session.storeId, createdAt: { gte: monthStart } },
    }),
  ]);

  const rows: CustomerRow[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    kana: c.kana,
    phone: c.phone,
    tags: c.tags.map(({ tag }) => ({ id: tag.id, name: tag.name, color: tag.color })),
    lastVisitLabel: c.lastVisitAt ? formatJstDate(c.lastVisitAt) : null,
    visitCount: c.visitCount,
    totalSpentLabel: formatYen(c.totalSpent),
    linked: Boolean(c.lineUserId),
  }));

  return (
    <>
      <PageHeader
        title="顧客管理"
        description="お客様の情報・来店履歴・LINE連携をまとめて管理します。"
        actions={
          <CustomerFormDialog
            mode="create"
            trigger={
              <Button>
                <Plus />
                顧客を登録
              </Button>
            }
          />
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="顧客数" value={`${formatNumber(totalCount)}名`} icon={<Users />} />
        <StatCard
          label="LINE連携済み"
          value={`${formatNumber(lineCount)}名`}
          icon={<MessageCircle />}
        />
        <StatCard label="今月の新規" value={`${formatNumber(newThisMonth)}名`} icon={<Sparkles />} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <CustomersToolbar
            tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
            initialQ={q}
            initialTag={tagId}
          />
          <CustomersTable rows={rows} />
        </CardContent>
      </Card>
    </>
  );
}
