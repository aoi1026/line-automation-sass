import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, notFound, parseBody, unauthorized } from "@/lib/api";

const updateServiceSchema = z.object({
  name: z.string().trim().min(1, "メニュー名を入力してください").max(100).optional(),
  category: z.string().trim().max(50).optional(),
  description: z.string().max(1000).optional(),
  durationMin: z
    .number({ invalid_type_error: "所要時間は数値で入力してください" })
    .int("所要時間は整数で入力してください")
    .min(5, "所要時間は5分以上で入力してください")
    .max(600, "所要時間は600分以内で入力してください")
    .optional(),
  price: z
    .number({ invalid_type_error: "価格は数値で入力してください" })
    .int("価格は整数で入力してください")
    .min(0, "価格は0円以上で入力してください")
    .max(10000000, "価格が大きすぎます")
    .optional(),
  repeatIntervalDays: z
    .number({ invalid_type_error: "推奨再来店間隔は数値で入力してください" })
    .int("推奨再来店間隔は整数で入力してください")
    .min(1, "推奨再来店間隔は1日以上で入力してください")
    .max(365, "推奨再来店間隔は365日以内で入力してください")
    .nullable()
    .optional(),
  sortOrder: z
    .number({ invalid_type_error: "表示順は数値で入力してください" })
    .int("表示順は整数で入力してください")
    .min(0)
    .max(9999)
    .optional(),
  active: z.boolean().optional(),
});

/** メニューを更新 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const service = await prisma.service.findFirst({
    where: { id, storeId: session.storeId },
    select: { id: true },
  });
  if (!service) return notFound("メニューが見つかりませんでした");

  const { data, error } = await parseBody(req, updateServiceSchema);
  if (error) return error;

  const patch: Prisma.ServiceUpdateInput = {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.category !== undefined ? { category: data.category } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.durationMin !== undefined ? { durationMin: data.durationMin } : {}),
    ...(data.price !== undefined ? { price: data.price } : {}),
    ...(data.repeatIntervalDays !== undefined ? { repeatIntervalDays: data.repeatIntervalDays } : {}),
    ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    ...(data.active !== undefined ? { active: data.active } : {}),
  };

  const updated = await prisma.service.update({
    where: { id: service.id },
    data: patch,
  });
  return NextResponse.json(updated);
}

/** メニューを削除（過去の予約は serviceId が null になり履歴は残る） */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const service = await prisma.service.findFirst({
    where: { id, storeId: session.storeId },
    select: { id: true },
  });
  if (!service) return notFound("メニューが見つかりませんでした");

  await prisma.service.delete({ where: { id: service.id } });
  return NextResponse.json({ ok: true });
}
