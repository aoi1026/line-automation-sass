import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getApiSession, parseBody, unauthorized } from "@/lib/api";
import { countUnread } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const readSchema = z.union([
  z.object({ id: z.string().min(1, "通知IDを指定してください") }),
  z.object({ all: z.literal(true) }),
]);

/** 通知を既読にする。body は { id } （1件）または { all: true } （すべて） */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, readSchema);
  if (error) return error;

  const readAt = new Date();
  if ("all" in data) {
    await prisma.notification.updateMany({
      where: { storeId: session.storeId, readAt: null },
      data: { readAt },
    });
  } else {
    // 所有チェックを兼ねて storeId でスコープ（他店舗の通知は更新されない）
    await prisma.notification.updateMany({
      where: { id: data.id, storeId: session.storeId, readAt: null },
      data: { readAt },
    });
  }

  const unreadCount = await countUnread(session.storeId);
  return NextResponse.json({ ok: true, unreadCount });
}
