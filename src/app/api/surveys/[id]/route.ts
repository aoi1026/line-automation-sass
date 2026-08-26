import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, notFound, parseBody, unauthorized } from "@/lib/api";
import { surveyQuestionsSchema } from "../schema";

const updateSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(100, "タイトルは100文字以内で入力してください")
    .optional(),
  description: z.string().trim().max(1000, "説明は1000文字以内で入力してください").optional(),
  thanksMessage: z
    .string()
    .trim()
    .max(1000, "回答後メッセージは1000文字以内で入力してください")
    .optional(),
  questions: surveyQuestionsSchema.optional(),
  active: z.boolean().optional(),
});

/** アンケート詳細（回答数・依頼数・平均評価つき） */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const survey = await prisma.survey.findFirst({
    where: { id, storeId: session.storeId },
    include: { _count: { select: { responses: true, requests: true } } },
  });
  if (!survey) return notFound("アンケートが見つかりませんでした");

  const ratingAgg = await prisma.surveyResponse.aggregate({
    where: { surveyId: survey.id, rating: { not: null } },
    _avg: { rating: true },
  });

  const { _count, ...rest } = survey;
  return NextResponse.json({
    ...rest,
    responseCount: _count.responses,
    requestCount: _count.requests,
    avgRating: ratingAgg._avg.rating ?? null,
  });
}

/** アンケート更新 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const survey = await prisma.survey.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!survey) return notFound("アンケートが見つかりませんでした");

  const { data, error } = await parseBody(req, updateSchema);
  if (error) return error;

  const updateData: Prisma.SurveyUpdateInput = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.thanksMessage !== undefined) updateData.thanksMessage = data.thanksMessage;
  if (data.questions !== undefined) updateData.questions = data.questions;
  if (data.active !== undefined) updateData.active = data.active;

  const updated = await prisma.survey.update({
    where: { id: survey.id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

/** アンケート削除（回答依頼・回答データも削除される） */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const survey = await prisma.survey.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!survey) return notFound("アンケートが見つかりませんでした");

  await prisma.survey.delete({ where: { id: survey.id } });

  return NextResponse.json({ ok: true });
}
