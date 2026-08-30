import type { Metadata } from "next";
import Link from "next/link";
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

const PAGE_SIZE = 30;

type CustomerWithTags = Prisma.CustomerGetPayload<{
  include: { tags: { include: { tag: true } } };
}>;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; page?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const tagId = (params.tag ?? "").trim();
  const pageParam = Number(params.page ?? "1");
  const requestedPage = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;

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

  const [matchedCount, tags, totalCount, lineCount, newThisMonth] = await Promise.all([
    prisma.customer.count({ where }),
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

  // 存在しないページ番号を指定された場合は最終ページを表示する
  const totalPages = Math.max(1, Math.ceil(matchedCount / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const customers: CustomerWithTags[] =
    matchedCount === 0
      ? []
      : await prisma.customer.findMany({
          where,
          include: { tags: { include: { tag: true } } },
          // ページ送りで同じ顧客が重複・欠落しないよう、最後にidで並びを確定させる
          orderBy: [
            { lastVisitAt: { sort: "desc", nulls: "last" } },
            { createdAt: "desc" },
            { id: "asc" },
          ],
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        });

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

  const from = matchedCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, matchedCount);

  /** 絞り込み条件を保ったままページを切り替えるリンク */
  function buildHref(targetPage: number): string {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (tagId) sp.set("tag", tagId);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `/dashboard/customers?${qs}` : "/dashboard/customers";
  }

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
                <Plus aria-hidden="true" />
                顧客を登録
              </Button>
            }
          />
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="顧客数" value={`${formatNumber(totalCount)}名`} icon={<Users aria-hidden="true" />} />
        <StatCard
          label="LINE連携済み"
          value={`${formatNumber(lineCount)}名`}
          icon={<MessageCircle aria-hidden="true" />}
        />
        <StatCard label="今月の新規" value={`${formatNumber(newThisMonth)}名`} icon={<Sparkles aria-hidden="true" />} />
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <CustomersToolbar
            tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
            initialQ={q}
            initialTag={tagId}
          />
          <CustomersTable rows={rows} hasFilter={q !== "" || tagId !== ""} />

          {matchedCount > 0 && (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-xs text-gray-500">
                全{formatNumber(matchedCount)}名中 {formatNumber(from)}〜{formatNumber(to)}名を表示
              </p>
              <div className="flex items-center gap-2">
                {page > 1 ? (
                  <Link href={buildHref(page - 1)}>
                    <Button variant="outline" size="sm">
                      前へ
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    前へ
                  </Button>
                )}
                <span className="text-xs text-gray-500">
                  {page} / {totalPages}
                </span>
                {page < totalPages ? (
                  <Link href={buildHref(page + 1)}>
                    <Button variant="outline" size="sm">
                      次へ
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    次へ
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
