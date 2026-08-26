import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareText, Send, SendHorizonal, TriangleAlert } from "lucide-react";
import type { MessageChannel, MessageKind, MessageStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  addDays,
  formatJstDateTime,
  formatJstDateTimeShort,
  fromJst,
  jstParts,
  jstStartOfDay,
} from "@/lib/jst";
import { formatNumber } from "@/lib/utils";
import {
  MESSAGE_CHANNEL_LABELS,
  MESSAGE_KIND_LABELS,
  MESSAGE_STATUS_LABELS,
} from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { MessageFilters } from "./_components/message-filters";
import { MessagesTable, type MessageRow } from "./_components/messages-table";

export const metadata: Metadata = { title: "メッセージ履歴" };

const PAGE_SIZE = 30;

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; kind?: string; status?: string; channel?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const storeId = session.storeId;

  const pageParam = Number(sp.page ?? "1");
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;
  const kind =
    sp.kind && sp.kind in MESSAGE_KIND_LABELS ? (sp.kind as MessageKind) : undefined;
  const status =
    sp.status && sp.status in MESSAGE_STATUS_LABELS ? (sp.status as MessageStatus) : undefined;
  const channel =
    sp.channel && sp.channel in MESSAGE_CHANNEL_LABELS
      ? (sp.channel as MessageChannel)
      : undefined;

  const where: Prisma.MessageLogWhereInput = { storeId };
  if (kind) where.kind = kind;
  if (status) where.status = status;
  if (channel) where.channel = channel;

  // 日付範囲（JST基準）
  const now = new Date();
  const todayStart = jstStartOfDay(now);
  const todayEnd = addDays(todayStart, 1);
  const { year, month } = jstParts(now);
  const monthStart = fromJst(`${year}-${String(month).padStart(2, "0")}-01`);
  const nextMonthStart =
    month === 12
      ? fromJst(`${year + 1}-01-01`)
      : fromJst(`${year}-${String(month + 1).padStart(2, "0")}-01`);

  const [total, logs, sentToday, sentThisMonth, failedThisMonth, skippedThisMonth] =
    await Promise.all([
      prisma.messageLog.count({ where }),
      prisma.messageLog.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { customer: { select: { id: true, name: true } } },
      }),
      prisma.messageLog.count({
        where: { storeId, status: "SENT", sentAt: { gte: todayStart, lt: todayEnd } },
      }),
      prisma.messageLog.count({
        where: { storeId, status: "SENT", sentAt: { gte: monthStart, lt: nextMonthStart } },
      }),
      prisma.messageLog.count({
        where: { storeId, status: "FAILED", sentAt: { gte: monthStart, lt: nextMonthStart } },
      }),
      prisma.messageLog.count({
        where: { storeId, status: "SKIPPED", sentAt: { gte: monthStart, lt: nextMonthStart } },
      }),
    ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  function buildHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (kind) params.set("kind", kind);
    if (status) params.set("status", status);
    if (channel) params.set("channel", channel);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/dashboard/messages?${qs}` : "/dashboard/messages";
  }

  const hasFilter = kind !== undefined || status !== undefined || channel !== undefined;

  const rows: MessageRow[] = logs.map((log) => ({
    id: log.id,
    sentAtShort: formatJstDateTimeShort(log.sentAt),
    sentAtFull: formatJstDateTime(log.sentAt),
    customerId: log.customer?.id ?? null,
    customerName: log.customer?.name ?? null,
    kind: log.kind,
    content: log.content,
    channel: log.channel,
    status: log.status,
    error: log.error,
  }));

  return (
    <>
      <PageHeader
        title="メッセージ履歴"
        description="お客様へ送信したLINEメッセージの配信履歴を確認できます。"
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="今日の配信" value={formatNumber(sentToday)} icon={<Send />} />
        <StatCard
          label="今月の配信"
          value={formatNumber(sentThisMonth)}
          icon={<SendHorizonal />}
        />
        <StatCard
          label="失敗"
          value={
            <span className={failedThisMonth > 0 ? "text-red-600" : undefined}>
              {formatNumber(failedThisMonth)}
            </span>
          }
          sub="今月"
          icon={<TriangleAlert />}
          className={failedThisMonth > 0 ? "border-red-200 bg-red-50/40" : undefined}
        />
        <StatCard
          label="スキップ"
          value={formatNumber(skippedThisMonth)}
          sub="今月"
          icon={<MessageSquareText />}
        />
      </div>

      <Card>
        <CardContent className="pt-5">
          <MessageFilters
            kind={kind ?? "all"}
            status={status ?? "all"}
            channel={channel ?? "all"}
          />

          {rows.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={<MessageSquareText />}
              title="まだ配信履歴がありません"
              description={
                hasFilter
                  ? "絞り込み条件を変更してお試しください。"
                  : "予約の確認やリマインダーが送信されるとここに表示されます。"
              }
            />
          ) : (
            <>
              <div className="mt-4">
                <MessagesTable rows={rows} />
              </div>

              <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
                <p className="text-xs text-gray-500">
                  全{formatNumber(total)}件中 {formatNumber(from)}〜{formatNumber(to)}件を表示
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
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
