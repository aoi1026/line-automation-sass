import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, notFound, parseBody, unauthorized } from "@/lib/api";
import { deliverMessage } from "@/lib/messaging";

const testSchema = z.object({
  customerId: z.string().min(1),
});

/** LINE接続テスト: 連携済み顧客にテストメッセージを送信する */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, testSchema);
  if (error) return error;

  const store = await prisma.store.findUnique({ where: { id: session.storeId } });
  if (!store) return notFound("店舗が見つかりませんでした");

  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, storeId: session.storeId },
  });
  if (!customer) return notFound("顧客が見つかりませんでした");
  if (!customer.lineUserId) {
    return jsonError("この顧客はLINE未連携のためテスト送信できません");
  }

  const log = await deliverMessage({
    store,
    customer,
    kind: "MANUAL",
    content: "リピナビからのテスト送信です。このメッセージが届いていれば連携は正常です。",
  });

  return NextResponse.json({
    status: log.status,
    channel: log.channel,
    error: log.error,
  });
}
