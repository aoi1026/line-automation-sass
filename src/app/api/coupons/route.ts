import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, parseBody, unauthorized } from "@/lib/api";
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

const createSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(100, "タイトルは100文字以内で入力してください"),
  description: z.string().trim().max(2000, "説明は2000文字以内で入力してください").default(""),
  discountType: z.enum(["PERCENT", "AMOUNT"]).default("PERCENT"),
  discountValue: z
    .number({ message: "割引値を数値で入力してください" })
    .int("割引値は整数で入力してください")
    .min(1, "割引値は1以上で入力してください"),
  code: z.string().trim().max(20, "店頭コードは20文字以内で入力してください").default(""),
  validFrom: z.string().regex(YMD_REGEX, "有効期間（開始）の形式が不正です").nullable().optional(),
  validUntil: z.string().regex(YMD_REGEX, "有効期間（終了）の形式が不正です").nullable().optional(),
  usageLimit: z
    .number({ message: "発行上限を数値で入力してください" })
    .int("発行上限は整数で入力してください")
    .min(1, "発行上限は1以上で入力してください")
    .nullable()
    .optional(),
  active: z.boolean().default(true),
});

/** クーポン一覧（発行数・使用数つき） */
export async function GET() {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const [coupons, usedCounts] = await Promise.all([
    prisma.coupon.findMany({
      where: { storeId: session.storeId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { issues: true } } },
    }),
    prisma.couponIssue.groupBy({
      by: ["couponId"],
      where: { coupon: { storeId: session.storeId }, usedAt: { not: null } },
      _count: { _all: true },
    }),
  ]);
  const usedMap = new Map(usedCounts.map((u) => [u.couponId, u._count._all]));

  return NextResponse.json(
    coupons.map(({ _count, ...coupon }) => ({
      ...coupon,
      issuedCount: _count.issues,
      usedCount: usedMap.get(coupon.id) ?? 0,
    }))
  );
}

/** クーポン作成 */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, createSchema);
  if (error) return error;

  if (data.discountType === "PERCENT" && (data.discountValue < 1 || data.discountValue > 100)) {
    return jsonError("％割引の割引値は1〜100の範囲で入力してください");
  }

  const validFrom = data.validFrom ? fromJst(data.validFrom) : null;
  const validUntil = data.validUntil ? endOfJstDay(data.validUntil) : null;
  if (validFrom && validUntil && validFrom > validUntil) {
    return jsonError("有効期間の開始日は終了日以前にしてください");
  }

  const coupon = await prisma.coupon.create({
    data: {
      storeId: session.storeId,
      title: data.title,
      description: data.description,
      discountType: data.discountType,
      discountValue: data.discountValue,
      code: data.code === "" ? generateCouponCode() : data.code,
      validFrom,
      validUntil,
      usageLimit: data.usageLimit ?? null,
      active: data.active,
    },
  });

  return NextResponse.json(coupon);
}
