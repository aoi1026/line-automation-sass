import { NextResponse } from "next/server";
import type { MessageChannel, MessageKind, MessageStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, unauthorized } from "@/lib/api";

const MESSAGE_KINDS: MessageKind[] = [
  "BOOKING_CONFIRMATION",
  "REMINDER",
  "CANCELLATION",
  "RESCHEDULE",
  "THANKS",
  "REBOOKING",
  "BIRTHDAY",
  "CAMPAIGN",
  "MANUAL",
];
const MESSAGE_STATUSES: MessageStatus[] = ["SENT", "FAILED", "SKIPPED"];
const MESSAGE_CHANNELS: MessageChannel[] = ["LINE", "DEMO"];

const PAGE_SIZE = 30;

/** 配信履歴一覧（?kind=&status=&channel=&page= で絞り込み・ページネーション） */
export async function GET(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const url = new URL(req.url);
  const kindParam = url.searchParams.get("kind");
  const statusParam = url.searchParams.get("status");
  const channelParam = url.searchParams.get("channel");
  const pageParam = Number(url.searchParams.get("page"));
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1;

  const kind = MESSAGE_KINDS.find((k) => k === kindParam);
  const status = MESSAGE_STATUSES.find((s) => s === statusParam);
  const channel = MESSAGE_CHANNELS.find((c) => c === channelParam);

  const where: Prisma.MessageLogWhereInput = {
    storeId: session.storeId,
    ...(kind ? { kind } : {}),
    ...(status ? { status } : {}),
    ...(channel ? { channel } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.messageLog.findMany({
      where,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.messageLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, pageSize: PAGE_SIZE });
}
