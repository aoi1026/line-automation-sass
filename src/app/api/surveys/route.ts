import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getApiSession, parseBody, unauthorized } from "@/lib/api";
import { surveyQuestionsSchema } from "./schema";

const createSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "タイトルを入力してください")
    .max(100, "タイトルは100文字以内で入力してください"),
  description: z.string().trim().max(1000, "説明は1000文字以内で入力してください").default(""),
  thanksMessage: z
    .string()
    .trim()
    .max(1000, "回答後メッセージは1000文字以内で入力してください")
    .default(""),
  questions: surveyQuestionsSchema,
  active: z.boolean().default(true),
});

/** アンケート一覧（回答数・依頼数つき） */
export async function GET() {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const surveys = await prisma.survey.findMany({
    where: { storeId: session.storeId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { responses: true, requests: true } } },
  });

  return NextResponse.json(
    surveys.map(({ _count, ...survey }) => ({
      ...survey,
      responseCount: _count.responses,
      requestCount: _count.requests,
    }))
  );
}

/** アンケート作成 */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, createSchema);
  if (error) return error;

  const survey = await prisma.survey.create({
    data: {
      storeId: session.storeId,
      title: data.title,
      description: data.description,
      // 空文字の場合はDBデフォルトのお礼メッセージを使用
      ...(data.thanksMessage !== "" ? { thanksMessage: data.thanksMessage } : {}),
      questions: data.questions,
      active: data.active,
    },
  });

  return NextResponse.json(survey);
}
