import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { getApiSession, notFound, parseBody, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/db";
import { segmentRulesSchema } from "@/lib/segments";

const updateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "セグメント名を入力してください")
    .max(100, "セグメント名は100文字以内で入力してください")
    .optional(),
  rules: segmentRulesSchema.optional(),
});

/** セグメント更新 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const segment = await prisma.segment.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!segment) return notFound("セグメントが見つかりませんでした");

  const { data, error } = await parseBody(req, updateSchema);
  if (error) return error;

  const updateData: Prisma.SegmentUpdateInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.rules !== undefined) updateData.rules = data.rules as Prisma.InputJsonValue;

  const updated = await prisma.segment.update({
    where: { id: segment.id },
    data: updateData,
  });
  return NextResponse.json(updated);
}

/** セグメント削除（参照しているキャンペーンの segmentId は SetNull で解除される） */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const segment = await prisma.segment.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!segment) return notFound("セグメントが見つかりませんでした");

  // このセグメントを参照している未配信のキャンペーンは、
  // segmentId が SetNull されると「全顧客」宛に変わってしまうため、
  // 削除前に抽出条件を campaign.filters へ退避して配信対象を維持する。
  // （配信済み・中止のキャンペーンは履歴として保持したいので触らない）
  await prisma.$transaction(async (tx) => {
    await tx.campaign.updateMany({
      where: {
        segmentId: segment.id,
        storeId: session.storeId,
        status: { in: ["DRAFT", "SCHEDULED"] },
      },
      data: { filters: segment.rules ?? {} },
    });
    await tx.segment.delete({ where: { id: segment.id } });
  });
  return NextResponse.json({ ok: true });
}
