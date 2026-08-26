"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatJstDateShort, jstDaysBetween } from "@/lib/jst";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";

/** 未読件数の再取得間隔（ミリ秒） */
const POLL_INTERVAL_MS = 60_000;
/** ドロップダウンに表示する件数 */
const POPOVER_LIMIT = 10;

/**
 * 通知1件分の表示データ。
 * 種別のラベル・色はサーバー側（@/lib/notifications）で解決して渡す。
 */
export type NotificationItem = {
  id: string;
  typeLabel: string;
  typeColor: string;
  title: string;
  body: string;
  link: string;
  /** 既読日時（ISO文字列）。未読は null */
  readAt: string | null;
  /** 作成日時（ISO文字列） */
  createdAt: string;
};

/** 「3分前」「2時間前」「昨日」のような相対時刻を日本語で返す */
export function formatRelativeJa(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diffMs = now.getTime() - then.getTime();
  if (Number.isNaN(diffMs)) return "";
  if (diffMs < 60_000) return "たった今";

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}分前`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;

  // 1日以上前はJSTの日付境界で数える
  const days = jstDaysBetween(then, now);
  if (days <= 1) return "昨日";
  if (days === 2) return "一昨日";
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週間前`;
  return formatJstDateShort(then);
}

/** 未読を表す左端のドット（既読の行でも幅を揃えるため常に描画する） */
function UnreadDot({ unread }: { unread: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", unread ? "bg-brand" : "bg-transparent")}
    />
  );
}

/** ヘッダーの通知ベル。未読バッジ + 最新10件のドロップダウン */
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [unread, setUnread] = React.useState(initialUnread);
  const [items, setItems] = React.useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = React.useState(false);

  // 通知一覧ページなど、ベル以外の場所で既読にしたときは router.refresh() により
  // サーバー側の未読件数が新しい値で渡ってくる。state は初期化時にしか
  // props を読まないため、変化を明示的に取り込んでバッジのズレを防ぐ。
  React.useEffect(() => {
    setUnread(initialUnread);
  }, [initialUnread]);

  const refreshUnread = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?count=1");
      if (!res.ok) return;
      const data: { unreadCount: number } = await res.json();
      setUnread(data.unreadCount);
    } catch {
      // 通信エラー時は次回のポーリングに任せる
    }
  }, []);

  const loadItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?limit=${POPOVER_LIMIT}`);
      if (!res.ok) return;
      const data: { unreadCount: number; items: NotificationItem[] } = await res.json();
      setItems(data.items);
      setUnread(data.unreadCount);
    } catch {
      // 取得できない場合は直前の内容を表示したままにする
    } finally {
      setLoading(false);
    }
  }, []);

  // 60秒ごとに未読件数のみ再取得。画面が非表示のあいだは停止する
  React.useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void refreshUnread();
    }, POLL_INTERVAL_MS);

    function handleVisibilityChange() {
      if (!document.hidden) void refreshUnread();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshUnread]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) void loadItems();
  }

  async function postRead(body: { id: string } | { all: true }): Promise<boolean> {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return false;
      const data: { unreadCount: number } = await res.json();
      setUnread(data.unreadCount);
      return true;
    } catch {
      return false;
    }
  }

  async function handleItemClick(item: NotificationItem) {
    if (!item.readAt) {
      const readAt = new Date().toISOString();
      setItems((prev) => prev?.map((n) => (n.id === item.id ? { ...n, readAt } : n)) ?? prev);
      await postRead({ id: item.id });
    }
    if (item.link) {
      setOpen(false);
      router.push(item.link);
    }
    router.refresh();
  }

  async function handleMarkAllRead() {
    const ok = await postRead({ all: true });
    if (!ok) {
      toast.error("既読にできませんでした");
      return;
    }
    const readAt = new Date().toISOString();
    setItems((prev) => prev?.map((n) => (n.readAt ? n : { ...n, readAt })) ?? prev);
    toast.success("すべて既読にしました");
    router.refresh();
  }

  const badgeLabel = unread > 9 ? "9+" : String(unread);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `通知（未読${unread}件）` : "通知"}
          className="relative rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
              {badgeLabel}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">通知</p>
          {unread > 0 && (
            <span className="text-xs text-gray-500">未読{unread}件</span>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {items === null && loading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : items && items.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => {
                const isUnread = item.readAt === null;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => void handleItemClick(item)}
                      className={cn(
                        "flex w-full gap-2.5 px-4 py-3 text-left transition-colors hover:bg-gray-50",
                        isUnread && "bg-brand/5"
                      )}
                    >
                      <UnreadDot unread={isUnread} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={item.typeColor}>
                            {item.typeLabel}
                          </Badge>
                          <span className="ml-auto shrink-0 text-[11px] text-gray-400">
                            {formatRelativeJa(item.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 truncate text-sm font-medium text-gray-900">
                          {item.title}
                        </p>
                        {item.body && (
                          <p className="mt-0.5 truncate text-xs text-gray-500">{item.body}</p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-10 text-center text-sm text-gray-500">
              新しい通知はありません
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-2">
          <button
            type="button"
            onClick={() => void handleMarkAllRead()}
            disabled={unread === 0}
            className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-40"
          >
            すべて既読にする
          </button>
          <Link
            href="/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="rounded-md px-2 py-1 text-xs font-medium text-brand-dark transition-colors hover:bg-brand/10"
          >
            すべての通知を見る
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
