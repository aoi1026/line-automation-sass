import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, notFound, parseBody, unauthorized } from "@/lib/api";

const kindSchema = z.enum([
  "BOOKING_CONFIRMATION",
  "REMINDER",
  "CANCELLATION",
  "RESCHEDULE",
  "THANKS",
  "REBOOKING",
  "BIRTHDAY",
]);

const updateSchema = z.object({
  kind: kindSchema.optional(),
  name: z
    .string()
    .trim()
    .min(1, "テンプレート名を入力してください")
    .max(100, "テンプレート名は100文字以内で入力してください")
    .optional(),
  content: z
    .string()
    .trim()
    .min(1, "本文を入力してください")
    .max(5000, "本文は5000文字以内で入力してください")
    .optional(),
  enabled: z.boolean().optional(),
});

/** テンプレート更新 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getApiSession();
  if (!session) return unauthorized();

  const template = await prisma.messageTemplate.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!template) return notFound("テンプレートが見つかりませんでした");

  const { data, error } = await parseBody(req, updateSchema);
  if (error) return error;

  const updateData: Prisma.MessageTemplateUpdateInput = {};
  if (data.kind !== undefined) updateData.kind = data.kind;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.enabled !== undefined) updateData.enabled = data.enabled;

  const updated = await prisma.messageTemplate.update({
    where: { id: template.id },
    data: updateData,
  });
  return NextResponse.json(updated);
}

/** テンプレート削除（自動配信設定の templateId は SetNull で解除され、標準文面に戻る） */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const session = await getApiSession();
  if (!session) return unauthorized();

  const template = await prisma.messageTemplate.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!template) return notFound("テンプレートが見つかりませんでした");

  await prisma.messageTemplate.delete({ where: { id: template.id } });
  return NextResponse.json({ ok: true });
}
