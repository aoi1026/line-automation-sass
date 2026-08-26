import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, unauthorized } from "@/lib/api";
import {
  NOTIFICATION_TYPE_COLORS,
  NOTIFICATION_TYPE_LABELS,
  countUnread,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * 通知一覧（新しい順）。
 * ?limit=10   取得件数（最大50）
 * ?unread=1   未読のみ
 * ?count=1    未読件数のみ返す（ベルのポーリング用）
 */
export async function GET(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const url = new URL(req.url);
  const countOnly = url.searchParams.get("count") === "1";
  const unreadCount = await countUnread(session.storeId);
  if (countOnly) return NextResponse.json({ unreadCount });

  const unreadOnly = url.searchParams.get("unread") === "1";
  const limitParam = Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT);
  const limit =
    Number.isInteger(limitParam) && limitParam >= 1
      ? Math.min(limitParam, MAX_LIMIT)
      : DEFAULT_LIMIT;

  const where: Prisma.NotificationWhereInput = { storeId: session.storeId };
  if (unreadOnly) where.readAt = null;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      link: true,
      readAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    unreadCount,
    items: notifications.map((n) => ({
      id: n.id,
      typeLabel: NOTIFICATION_TYPE_LABELS[n.type],
      typeColor: NOTIFICATION_TYPE_COLORS[n.type],
      title: n.title,
      body: n.body,
      link: n.link,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
