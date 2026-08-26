import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getApiSession, jsonError, parseBody, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseRules, resolveTargets, segmentRulesSchema } from "@/lib/segments";

const createSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(100, "タイトルは100文字以内で入力してください"),
  content: z
    .string()
    .trim()
    .min(1, "本文を入力してください")
    .max(5000, "本文は5000文字以内で入力してください"),
  segmentId: z.string().nullable().optional(),
  filters: segmentRulesSchema.nullable().optional(),
  couponId: z.string().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "SCHEDULED"]),
});

/** キャンペーン一覧 */
export async function GET() {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const campaigns = await prisma.campaign.findMany({
    where: { storeId: session.storeId },
    include: { segment: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(campaigns);
}

/** キャンペーン作成（下書き / 配信予約） */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, createSchema);
  if (error) return error;

  // 対象セグメント・クーポンの所有チェック
  let segmentRules = parseRules(data.filters ?? {});
  if (data.segmentId) {
    const segment = await prisma.segment.findFirst({
      where: { id: data.segmentId, storeId: session.storeId },
    });
    if (!segment) return jsonError("指定されたセグメントが見つかりません");
    segmentRules = parseRules(segment.rules);
  }
  if (data.couponId) {
    const coupon = await prisma.coupon.findFirst({
      where: { id: data.couponId, storeId: session.storeId },
    });
    if (!coupon) return jsonError("指定されたクーポンが見つかりません");
  }

  // 配信予約時は予定日時が必須
  let scheduledAt: Date | null = null;
  if (data.status === "SCHEDULED") {
    if (!data.scheduledAt) return jsonError("配信予定日時を指定してください");
    scheduledAt = new Date(data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) return jsonError("配信予定日時が不正です");
    if (scheduledAt.getTime() < Date.now() - 60_000) {
      return jsonError("配信予定日時には現在以降の日時を指定してください");
    }
  }

  const targets = await resolveTargets(session.storeId, segmentRules);

  const campaign = await prisma.campaign.create({
    data: {
      storeId: session.storeId,
      title: data.title,
      content: data.content,
      segmentId: data.segmentId ?? null,
      filters: data.segmentId
        ? Prisma.JsonNull
        : ((data.filters ?? Prisma.JsonNull) as Prisma.InputJsonValue | typeof Prisma.JsonNull),
      couponId: data.couponId ?? null,
      status: data.status,
      scheduledAt,
      targetCount: targets.length,
    },
  });
  return NextResponse.json(campaign);
}
