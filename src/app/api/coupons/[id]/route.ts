import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, notFound, parseBody, unauthorized } from "@/lib/api";
import { fromJst } from "@/lib/jst";

const YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** 店頭コード自動生成（英大文字+数字6桁） */
function generateCouponCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** "YYYY-MM-DD"（JST）→ その日の終わり（23:59:59.999 JST） */
function endOfJstDay(ymd: string): Date {
  return new Date(fromJst(ymd).getTime() + 86_400_000 - 1);
}

const updateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(100, "タイトルは100文字以内で入力してください")
    .optional(),
  description: z.string().trim().max(2000, "説明は2000文字以内で入力してください").optional(),
  discountType: z.enum(["PERCENT", "AMOUNT"]).optional(),
  discountValue: z
    .number({ message: "割引値を数値で入力してください" })
    .int("割引値は整数で入力してください")
    .min(1, "割引値は1以上で入力してください")
    .optional(),
  code: z.string().trim().max(20, "店頭コードは20文字以内で入力してください").optional(),
  validFrom: z.string().regex(YMD_REGEX, "有効期間（開始）の形式が不正です").nullable().optional(),
  validUntil: z.string().regex(YMD_REGEX, "有効期間（終了）の形式が不正です").nullable().optional(),
  usageLimit: z
    .number({ message: "発行上限を数値で入力してください" })
    .int("発行上限は整数で入力してください")
    .min(1, "発行上限は1以上で入力してください")
    .nullable()
    .optional(),
  active: z.boolean().optional(),
});

/** クーポン詳細（発行数・使用数つき） */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const coupon = await prisma.coupon.findFirst({
    where: { id, storeId: session.storeId },
    include: { _count: { select: { issues: true } } },
  });
  if (!coupon) return notFound("クーポンが見つかりませんでした");

  const usedCount = await prisma.couponIssue.count({
    where: { couponId: coupon.id, usedAt: { not: null } },
  });

  const { _count, ...rest } = coupon;
  return NextResponse.json({ ...rest, issuedCount: _count.issues, usedCount });
}

/** クーポン更新 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const coupon = await prisma.coupon.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!coupon) return notFound("クーポンが見つかりませんでした");

  const { data, error } = await parseBody(req, updateSchema);
  if (error) return error;

  const effectiveType = data.discountType ?? coupon.discountType;
  const effectiveValue = data.discountValue ?? coupon.discountValue;
  if (effectiveType === "PERCENT" && (effectiveValue < 1 || effectiveValue > 100)) {
    return jsonError("％割引の割引値は1〜100の範囲で入力してください");
  }

  const effectiveFrom =
    data.validFrom === undefined
      ? coupon.validFrom
      : data.validFrom === null
        ? null
        : fromJst(data.validFrom);
  const effectiveUntil =
    data.validUntil === undefined
      ? coupon.validUntil
      : data.validUntil === null
        ? null
        : endOfJstDay(data.validUntil);
  if (effectiveFrom && effectiveUntil && effectiveFrom > effectiveUntil) {
    return jsonError("有効期間の開始日は終了日以前にしてください");
  }

  const updateData: Prisma.CouponUpdateInput = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.discountType !== undefined) updateData.discountType = data.discountType;
  if (data.discountValue !== undefined) updateData.discountValue = data.discountValue;
  if (data.code !== undefined) updateData.code = data.code === "" ? generateCouponCode() : data.code;
  if (data.validFrom !== undefined) updateData.validFrom = effectiveFrom;
  if (data.validUntil !== undefined) updateData.validUntil = effectiveUntil;
  if (data.usageLimit !== undefined) updateData.usageLimit = data.usageLimit;
  if (data.active !== undefined) updateData.active = data.active;

  const updated = await prisma.coupon.update({
    where: { id: coupon.id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

/** クーポン削除 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const coupon = await prisma.coupon.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!coupon) return notFound("クーポンが見つかりませんでした");

  await prisma.coupon.delete({ where: { id: coupon.id } });

  return NextResponse.json({ ok: true });
}
