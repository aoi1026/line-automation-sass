import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import {
  NOTIFICATION_TYPE_COLORS,
  NOTIFICATION_TYPE_LABELS,
  countUnread,
} from "@/lib/notifications";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { NotificationItem } from "@/components/shell/notification-bell";
import { MarkAllReadButton } from "./_components/mark-all-read-button";
import { NotificationList } from "./_components/notification-list";

const PAGE_SIZE = 30;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const storeId = session.storeId;

  const filter: "all" | "unread" = sp.filter === "unread" ? "unread" : "all";
  const pageParam = Number(sp.page ?? "1");
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;

  const where: Prisma.NotificationWhereInput = { storeId };
  if (filter === "unread") where.readAt = null;

  const [total, notifications, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    countUnread(storeId),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  function buildHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (filter === "unread") params.set("filter", "unread");
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/dashboard/notifications?${qs}` : "/dashboard/notifications";
  }

  const items: NotificationItem[] = notifications.map((n) => ({
    id: n.id,
    typeLabel: NOTIFICATION_TYPE_LABELS[n.type],
    typeColor: NOTIFICATION_TYPE_COLORS[n.type],
    title: n.title,
    body: n.body,
    link: n.link,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        title="通知センター"
        description="Web予約の受付やお客様からのキャンセル、低評価のアンケート回答をまとめて確認できます。"
        actions={<MarkAllReadButton unreadCount={unreadCount} />}
      />

      <Card>
        <CardContent className="pt-5">
          <NotificationList items={items} filter={filter} unreadCount={unreadCount} />

          {total > 0 && (
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
          )}
        </CardContent>
      </Card>
    </>
  );
}
