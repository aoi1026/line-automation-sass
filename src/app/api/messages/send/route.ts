import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, notFound, parseBody, unauthorized } from "@/lib/api";
import { deliverMessage } from "@/lib/messaging";

const sendMessageSchema = z.object({
  customerId: z.string().min(1, "顧客を指定してください"),
  content: z
    .string()
    .trim()
    .min(1, "本文を入力してください")
    .max(2000, "本文は2000文字以内で入力してください"),
});

/** 顧客への個別LINEメッセージ送信（顧客詳細ページ等から呼び出される） */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, sendMessageSchema);
  if (error) return error;

  const [customer, store] = await Promise.all([
    prisma.customer.findFirst({
      where: { id: data.customerId, storeId: session.storeId },
    }),
    prisma.store.findUnique({ where: { id: session.storeId } }),
  ]);
  if (!customer) return notFound("顧客が見つかりませんでした");
  if (!store) return notFound("店舗が見つかりませんでした");

  const log = await deliverMessage({
    store,
    customer,
    kind: "MANUAL",
    content: data.content,
  });

  if (log.status === "FAILED") {
    return jsonError(`送信に失敗しました: ${log.error}`);
  }
  if (log.status === "SKIPPED") {
    return jsonError("この顧客はLINE未連携のため送信できません");
  }
  return NextResponse.json({ ok: true });
}
