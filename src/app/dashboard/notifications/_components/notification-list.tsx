"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BellOff } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { formatJstDateTime } from "@/lib/jst";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatRelativeJa,
  type NotificationItem,
} from "@/components/shell/notification-bell";

/** 通知一覧の絞り込みタブ + 一覧。行クリックで既読にしてから遷移する */
export function NotificationList({
  items,
  filter,
  unreadCount,
}: {
  items: NotificationItem[];
  filter: "all" | "unread";
  unreadCount: number;
}) {
  const router = useRouter();
  const [readIds, setReadIds] = React.useState<ReadonlySet<string>>(new Set());
  const [now, setNow] = React.useState(() => new Date());

  // 相対時刻はマウント後に現在時刻へ揃え、1分ごとに更新する
  React.useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function handleFilterChange(value: string) {
    router.push(
      value === "unread" ? "/dashboard/notifications?filter=unread" : "/dashboard/notifications"
    );
  }

  async function handleItemClick(item: NotificationItem, isUnread: boolean) {
    if (isUnread) {
      setReadIds((prev) => new Set(prev).add(item.id));
      try {
        await fetch("/api/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        });
      } catch {
        // 既読化に失敗しても遷移は妨げない（次回表示時に未読のまま残る）
      }
    }
    if (item.link) {
      router.push(item.link);
    }
    router.refresh();
  }

  return (
    <>
      <Tabs value={filter} onValueChange={handleFilterChange}>
        <TabsList>
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="unread">
            未読{unreadCount > 0 ? `（${formatNumber(unreadCount)}）` : ""}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {items.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={<BellOff />}
          title={filter === "unread" ? "未読の通知はありません" : "通知はまだありません"}
          description={
            filter === "unread"
              ? "新しい通知が届くとここに表示されます。"
              : "Web予約の受付、お客様によるキャンセル、低評価のアンケート回答があるとここに表示されます。"
          }
        />
      ) : (
        <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100">
          {items.map((item) => {
            const isUnread = item.readAt === null && !readIds.has(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void handleItemClick(item, isUnread)}
                  className={cn(
                    "flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50",
                    isUnread && "bg-brand/5"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "mt-2 h-2 w-2 shrink-0 rounded-full",
                      isUnread ? "bg-brand" : "bg-transparent"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={item.typeColor}>
                        {item.typeLabel}
                      </Badge>
                      <span
                        className="ml-auto shrink-0 text-xs text-gray-400"
                        title={formatJstDateTime(new Date(item.createdAt))}
                        suppressHydrationWarning
                      >
                        {formatRelativeJa(item.createdAt, now)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-gray-900">{item.title}</p>
                    {item.body && <p className="mt-0.5 text-sm text-gray-500">{item.body}</p>}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
