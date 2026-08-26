import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, notFound, parseBody, unauthorized } from "@/lib/api";
import { fromJst } from "@/lib/jst";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const updateSchema = z.object({
  staffId: z.string().nullable().optional(),
  serviceName: z.string().trim().max(200, "メニュー名が長すぎます").optional(),
  content: z
    .string()
    .trim()
    .min(1, "施術内容を入力してください")
    .max(5000, "施術内容が長すぎます")
    .optional(),
  materials: z.string().max(5000, "使用薬剤が長すぎます").optional(),
  nextNote: z.string().max(5000, "申し送りが長すぎます").optional(),
  visitedAt: z.string().regex(DATE_RE, "来店日の形式が不正です").optional(),
});

/** カルテを更新 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const record = await prisma.treatmentRecord.findFirst({
    where: { id, storeId: session.storeId },
    select: { id: true },
  });
  if (!record) return notFound("カルテが見つかりませんでした");

  const { data, error } = await parseBody(req, updateSchema);
  if (error) return error;

  if (data.staffId) {
    const staff = await prisma.staffMember.findFirst({
      where: { id: data.staffId, storeId: session.storeId },
      select: { id: true },
    });
    if (!staff) return notFound("スタッフが見つかりませんでした");
  }

  const patch: Prisma.TreatmentRecordUpdateInput = {
    ...(data.serviceName !== undefined ? { serviceName: data.serviceName } : {}),
    ...(data.content !== undefined ? { content: data.content } : {}),
    ...(data.materials !== undefined ? { materials: data.materials } : {}),
    ...(data.nextNote !== undefined ? { nextNote: data.nextNote } : {}),
    ...(data.visitedAt !== undefined ? { visitedAt: fromJst(data.visitedAt) } : {}),
    ...(data.staffId !== undefined
      ? data.staffId
        ? { staff: { connect: { id: data.staffId } } }
        : { staff: { disconnect: true } }
      : {}),
  };

  const updated = await prisma.treatmentRecord.update({
    where: { id: record.id },
    data: patch,
    include: { staff: { select: { id: true, name: true } } },
  });
  return NextResponse.json(updated);
}

/** カルテを削除 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const record = await prisma.treatmentRecord.findFirst({
    where: { id, storeId: session.storeId },
    select: { id: true },
  });
  if (!record) return notFound("カルテが見つかりませんでした");

  await prisma.treatmentRecord.delete({ where: { id: record.id } });
  return NextResponse.json({ ok: true });
}
