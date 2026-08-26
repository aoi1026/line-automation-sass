import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getApiSession, notFound, parseBody, unauthorized } from "@/lib/api";
import { AUTOMATION_KINDS } from "@/lib/constants";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  offsetValue: z
    .number()
    .int("タイミングは整数で指定してください")
    .min(1, "タイミングは1以上で指定してください")
    .max(60, "タイミングは60以下で指定してください")
    .optional(),
  offsetUnit: z.enum(["hours", "days"]).optional(),
  sendHourJst: z
    .number()
    .int("送信時刻は整数で指定してください")
    .min(0, "送信時刻は0〜23で指定してください")
    .max(23, "送信時刻は0〜23で指定してください")
    .optional(),
  templateId: z.string().nullable().optional(),
  couponId: z.string().nullable().optional(),
  surveyId: z.string().nullable().optional(),
});

/**
 * 自動配信設定の更新（storeId × kind で upsert）
 * PATCH /api/automations/[kind]
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind: kindParam } = await ctx.params;
  const session = await getApiSession();
  if (!session) return unauthorized();

  const kind = AUTOMATION_KINDS.find((k) => k === kindParam);
  if (!kind) return notFound("自動配信の種別が不正です");

  const { data, error } = await parseBody(req, patchSchema);
  if (error) return error;

  // 参照先の所有チェック（他店舗のリソースを紐付けさせない）
  if (typeof data.templateId === "string") {
    const template = await prisma.messageTemplate.findFirst({
      where: { id: data.templateId, storeId: session.storeId, kind },
    });
    if (!template) return notFound("テンプレートが見つかりませんでした");
  }
  if (typeof data.couponId === "string") {
    const coupon = await prisma.coupon.findFirst({
      where: { id: data.couponId, storeId: session.storeId },
    });
    if (!coupon) return notFound("クーポンが見つかりませんでした");
  }
  if (typeof data.surveyId === "string") {
    const survey = await prisma.survey.findFirst({
      where: { id: data.surveyId, storeId: session.storeId },
    });
    if (!survey) return notFound("アンケートが見つかりませんでした");
  }

  const setting = await prisma.automationSetting.upsert({
    where: { storeId_kind: { storeId: session.storeId, kind } },
    create: {
      storeId: session.storeId,
      kind,
      enabled: data.enabled ?? false,
      offsetValue: data.offsetValue,
      offsetUnit: data.offsetUnit,
      sendHourJst: data.sendHourJst,
      templateId: data.templateId ?? null,
      couponId: data.couponId ?? null,
      surveyId: data.surveyId ?? null,
    },
    update: {
      enabled: data.enabled,
      offsetValue: data.offsetValue,
      offsetUnit: data.offsetUnit,
      sendHourJst: data.sendHourJst,
      templateId: data.templateId,
      couponId: data.couponId,
      surveyId: data.surveyId,
    },
  });
  return NextResponse.json(setting);
}
