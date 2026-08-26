import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, notFound, parseBody, unauthorized } from "@/lib/api";

const updateStaffSchema = z.object({
  name: z.string().trim().min(1, "スタッフ名を入力してください").max(100).optional(),
  title: z.string().trim().max(50).optional(),
  sortOrder: z
    .number({ invalid_type_error: "表示順は数値で入力してください" })
    .int("表示順は整数で入力してください")
    .min(0)
    .max(9999)
    .optional(),
  active: z.boolean().optional(),
});

/** スタッフを更新 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const staff = await prisma.staffMember.findFirst({
    where: { id, storeId: session.storeId },
    select: { id: true },
  });
  if (!staff) return notFound("スタッフが見つかりませんでした");

  const { data, error } = await parseBody(req, updateStaffSchema);
  if (error) return error;

  const patch: Prisma.StaffMemberUpdateInput = {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.title !== undefined ? { title: data.title } : {}),
    ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    ...(data.active !== undefined ? { active: data.active } : {}),
  };

  const updated = await prisma.staffMember.update({
    where: { id: staff.id },
    data: patch,
  });
  return NextResponse.json(updated);
}

/** スタッフを削除（過去の予約は staffId が null になり履歴は残る） */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const staff = await prisma.staffMember.findFirst({
    where: { id, storeId: session.storeId },
    select: { id: true },
  });
  if (!staff) return notFound("スタッフが見つかりませんでした");

  await prisma.staffMember.delete({ where: { id: staff.id } });
  return NextResponse.json({ ok: true });
}
