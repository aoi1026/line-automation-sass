import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, parseBody, unauthorized } from "@/lib/api";
import { DAY_KEYS, DAY_LABELS_JA } from "@/lib/jst";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const daySchema = z.object({
  open: z.string().regex(TIME_RE, "時刻の形式が不正です"),
  close: z.string().regex(TIME_RE, "時刻の形式が不正です"),
  closed: z.boolean(),
});

const businessHoursSchema = z.object({
  mon: daySchema,
  tue: daySchema,
  wed: daySchema,
  thu: daySchema,
  fri: daySchema,
  sat: daySchema,
  sun: daySchema,
});

const updateStoreSchema = z.object({
  name: z.string().trim().min(1, "店舗名を入力してください").max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(200).optional(),
  description: z.string().max(2000).optional(),
  slotIntervalMin: z
    .number()
    .int()
    .refine((v) => [15, 30, 60].includes(v), "予約枠の間隔は15分・30分・60分のいずれかを指定してください")
    .optional(),
  defaultRebookingIntervalDays: z
    .number()
    .int()
    .min(1, "1日以上で指定してください")
    .max(365, "365日以内で指定してください")
    .optional(),
  businessHours: businessHoursSchema.optional(),
  lineChannelAccessToken: z.string().trim().max(1000).optional(),
  lineChannelSecret: z.string().trim().max(200).optional(),
  lineBasicId: z.string().trim().max(50).optional(),
  action: z.literal("unlink_line").optional(),
});

/** 店舗設定を更新 */
export async function PATCH(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, updateStoreSchema);
  if (error) return error;

  if (data.businessHours) {
    for (const day of DAY_KEYS) {
      const d = data.businessHours[day];
      if (!d.closed && d.close <= d.open) {
        return jsonError(`${DAY_LABELS_JA[day]}曜日: 閉店時刻は開店時刻より後にしてください`);
      }
    }
  }

  const patch: Prisma.StoreUpdateInput = {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.phone !== undefined ? { phone: data.phone } : {}),
    ...(data.address !== undefined ? { address: data.address } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.slotIntervalMin !== undefined ? { slotIntervalMin: data.slotIntervalMin } : {}),
    ...(data.defaultRebookingIntervalDays !== undefined
      ? { defaultRebookingIntervalDays: data.defaultRebookingIntervalDays }
      : {}),
    ...(data.businessHours !== undefined ? { businessHours: data.businessHours } : {}),
  };

  if (data.action === "unlink_line") {
    // LINE連携を解除（デモモードに戻す）
    patch.lineChannelAccessToken = "";
    patch.lineChannelSecret = "";
    patch.lineBasicId = "";
  } else {
    // トークン・シークレットは空文字なら「変更しない」扱い
    if (data.lineChannelAccessToken) patch.lineChannelAccessToken = data.lineChannelAccessToken;
    if (data.lineChannelSecret) patch.lineChannelSecret = data.lineChannelSecret;
    if (data.lineBasicId !== undefined) patch.lineBasicId = data.lineBasicId;
  }

  await prisma.store.update({ where: { id: session.storeId }, data: patch });
  return NextResponse.json({ ok: true });
}
