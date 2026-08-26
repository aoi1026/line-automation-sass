import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getApiSession, jsonError, notFound, parseBody, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/db";
import { parseRules, resolveTargets, segmentRulesSchema, type SegmentRules } from "@/lib/segments";

const updateSchema = z.object({
  action: z.literal("cancel").optional(),
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(100, "タイトルは100文字以内で入力してください")
    .optional(),
  content: z
    .string()
    .trim()
    .min(1, "本文を入力してください")
    .max(5000, "本文は5000文字以内で入力してください")
    .optional(),
  segmentId: z.string().nullable().optional(),
  filters: segmentRulesSchema.nullable().optional(),
  couponId: z.string().nullable().optional(),
  scheduledAt: z.string().nullable().optional(),
  status: z.enum(["DRAFT", "SCHEDULED"]).optional(),
});

/**
 * キャンペーン更新。
 * - { action: "cancel" }: 配信予約の中止（SCHEDULED → CANCELLED）
 * - それ以外: 内容の編集（下書き・配信予約中のみ）。対象人数は保存時に再計算する。
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!campaign) return notFound("キャンペーンが見つかりませんでした");

  const { data, error } = await parseBody(req, updateSchema);
  if (error) return error;

  // 配信予約の中止
  if (data.action === "cancel") {
    if (campaign.status !== "SCHEDULED") {
      return jsonError("配信予約中のキャンペーンのみ中止できます");
    }
    // 配信エンジンが同時に SENDING へ進めている場合があるため、
    // ステータス条件付きで更新し、取得できなければ競合として扱う
    const claimed = await prisma.campaign.updateMany({
      where: { id: campaign.id, status: "SCHEDULED" },
      data: { status: "CANCELLED" },
    });
    if (claimed.count === 0) {
      return jsonError("配信が開始されたため中止できませんでした");
    }
    const cancelled = await prisma.campaign.findUnique({ where: { id: campaign.id } });
    return NextResponse.json(cancelled);
  }

  if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
    return jsonError("下書きまたは配信予約中のキャンペーンのみ編集できます");
  }

  // 対象セグメント・クーポンの所有チェック
  const effectiveSegmentId =
    data.segmentId !== undefined ? data.segmentId : campaign.segmentId;
  let rules: SegmentRules;
  if (effectiveSegmentId) {
    const segment = await prisma.segment.findFirst({
      where: { id: effectiveSegmentId, storeId: session.storeId },
    });
    if (!segment) return jsonError("指定されたセグメントが見つかりません");
    rules = parseRules(segment.rules);
  } else {
    rules =
      data.filters !== undefined
        ? parseRules(data.filters ?? {})
        : parseRules(campaign.filters ?? {});
  }
  if (data.couponId) {
    const coupon = await prisma.coupon.findFirst({
      where: { id: data.couponId, storeId: session.storeId },
    });
    if (!coupon) return jsonError("指定されたクーポンが見つかりません");
  }

  const update: Prisma.CampaignUncheckedUpdateInput = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.content !== undefined) update.content = data.content;
  if (data.segmentId !== undefined) update.segmentId = data.segmentId;
  if (data.segmentId) {
    update.filters = Prisma.JsonNull;
  } else if (data.filters !== undefined) {
    update.filters = (data.filters ?? Prisma.JsonNull) as
      | Prisma.InputJsonValue
      | typeof Prisma.JsonNull;
  }
  if (data.couponId !== undefined) update.couponId = data.couponId;

  if (data.status === "SCHEDULED") {
    if (!data.scheduledAt) return jsonError("配信予定日時を指定してください");
    const scheduledAt = new Date(data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) return jsonError("配信予定日時が不正です");
    if (scheduledAt.getTime() < Date.now() - 60_000) {
      return jsonError("配信予定日時には現在以降の日時を指定してください");
    }
    update.status = "SCHEDULED";
    update.scheduledAt = scheduledAt;
  } else if (data.status === "DRAFT") {
    update.status = "DRAFT";
    update.scheduledAt = null;
  }

  // 保存時点の対象人数を再計算
  const targets = await resolveTargets(session.storeId, rules);
  update.targetCount = targets.length;

  // 編集中に配信が開始された場合は上書きしない（下書き・配信予約中のときだけ更新）
  const saved = await prisma.campaign.updateMany({
    where: { id: campaign.id, status: { in: ["DRAFT", "SCHEDULED"] } },
    data: update,
  });
  if (saved.count === 0) {
    return jsonError("配信が開始されたため保存できませんでした");
  }
  const updated = await prisma.campaign.findUnique({ where: { id: campaign.id } });
  return NextResponse.json(updated);
}

/** キャンペーン削除（下書き・中止のみ） */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!campaign) return notFound("キャンペーンが見つかりませんでした");
  if (campaign.status !== "DRAFT" && campaign.status !== "CANCELLED") {
    return jsonError("下書きまたは中止したキャンペーンのみ削除できます");
  }

  await prisma.campaign.delete({ where: { id: campaign.id } });
  return NextResponse.json({ ok: true });
}
