import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, notFound, parseBody, unauthorized } from "@/lib/api";
import { fromJst } from "@/lib/jst";

const updateCustomerSchema = z.object({
  name: z.string().trim().min(1, "氏名を入力してください").max(100).optional(),
  kana: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().max(200).optional(),
  gender: z.enum(["", "female", "male", "other"]).optional(),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "誕生日の形式が不正です")
    .nullable()
    .optional(),
  notes: z.string().max(2000).optional(),
  tagIds: z.array(z.string()).optional(),
  action: z.literal("unlink_line").optional(),
});

/** 顧客詳細 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const customer = await prisma.customer.findFirst({
    where: { id, storeId: session.storeId },
    include: { tags: { include: { tag: true } } },
  });
  if (!customer) return notFound("顧客が見つかりませんでした");
  return NextResponse.json(customer);
}

/** 顧客情報を更新（基本情報 / タグの一括設定 / LINE連携解除） */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const customer = await prisma.customer.findFirst({
    where: { id, storeId: session.storeId },
    select: { id: true },
  });
  if (!customer) return notFound("顧客が見つかりませんでした");

  const { data, error } = await parseBody(req, updateCustomerSchema);
  if (error) return error;

  if (data.action === "unlink_line") {
    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: { lineUserId: null, lineDisplayName: "" },
      include: { tags: { include: { tag: true } } },
    });
    return NextResponse.json(updated);
  }

  if (data.tagIds !== undefined) {
    const tags = data.tagIds.length
      ? await prisma.tag.findMany({
          where: { id: { in: data.tagIds }, storeId: session.storeId },
          select: { id: true },
        })
      : [];
    await prisma.$transaction([
      prisma.customerTag.deleteMany({ where: { customerId: customer.id } }),
      prisma.customerTag.createMany({
        data: tags.map((t) => ({ customerId: customer.id, tagId: t.id })),
      }),
    ]);
  }

  const patch: Prisma.CustomerUpdateInput = {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.kana !== undefined ? { kana: data.kana } : {}),
    ...(data.phone !== undefined ? { phone: data.phone } : {}),
    ...(data.email !== undefined ? { email: data.email } : {}),
    ...(data.gender !== undefined ? { gender: data.gender } : {}),
    ...(data.birthday !== undefined
      ? { birthday: data.birthday ? fromJst(data.birthday) : null }
      : {}),
    ...(data.notes !== undefined ? { notes: data.notes } : {}),
  };

  const updated = await prisma.customer.update({
    where: { id: customer.id },
    data: patch,
    include: { tags: { include: { tag: true } } },
  });
  return NextResponse.json(updated);
}

/** 顧客を削除（予約・履歴などはカスケード削除） */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const customer = await prisma.customer.findFirst({
    where: { id, storeId: session.storeId },
    select: { id: true },
  });
  if (!customer) return notFound("顧客が見つかりませんでした");

  await prisma.customer.delete({ where: { id: customer.id } });
  return NextResponse.json({ ok: true });
}
