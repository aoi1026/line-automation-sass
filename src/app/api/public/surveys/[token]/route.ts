import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, notFound, parseBody } from "@/lib/api";
import { parseSurveyQuestions } from "@/app/api/surveys/schema";

const FALLBACK_THANKS = "ご回答ありがとうございました。";

const submitSchema = z.object({
  answers: z.record(z.union([z.number(), z.string()])),
});

/**
 * アンケート回答の送信（公開・認証不要）。
 * SurveyRequest のトークンで厳密にスコープする。
 */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  const { data, error } = await parseBody(req, submitSchema);
  if (error) return error;

  const request = await prisma.surveyRequest.findUnique({
    where: { token },
    include: { survey: true },
  });
  if (!request || !request.survey.active) {
    return notFound("アンケートが見つかりませんでした");
  }
  if (request.respondedAt) {
    return jsonError("このアンケートは回答済みです", 409);
  }

  const questions = parseSurveyQuestions(request.survey.questions);
  if (questions.length === 0) {
    return notFound("アンケートが見つかりませんでした");
  }

  // 質問定義に沿って回答を検証・正規化（定義にないキーは無視）
  const answers: Record<string, number | string> = {};
  for (const question of questions) {
    const raw = data.answers[question.id];

    if (question.type === "rating") {
      if (raw === undefined || raw === "") {
        if (question.required) return jsonError(`「${question.label}」への回答は必須です`);
        continue;
      }
      const value = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isInteger(value) || value < 1 || value > 5) {
        return jsonError(`「${question.label}」の評価が不正です`);
      }
      answers[question.id] = value;
    } else if (question.type === "choice") {
      if (raw === undefined || raw === "") {
        if (question.required) return jsonError(`「${question.label}」への回答は必須です`);
        continue;
      }
      if (typeof raw !== "string" || !(question.options ?? []).includes(raw)) {
        return jsonError(`「${question.label}」の選択肢が不正です`);
      }
      answers[question.id] = raw;
    } else {
      const text = typeof raw === "string" ? raw.trim() : "";
      if (text === "") {
        if (question.required) return jsonError(`「${question.label}」への回答は必須です`);
        continue;
      }
      if (text.length > 2000) {
        return jsonError(`「${question.label}」は2000文字以内で入力してください`);
      }
      answers[question.id] = text;
    }
  }

  // 総合評価: 最初のratingタイプ質問の回答 / コメント: 最初のtextタイプ質問の回答
  const firstRating = questions.find((q) => q.type === "rating");
  const ratingValue = firstRating ? answers[firstRating.id] : undefined;
  const rating = typeof ratingValue === "number" ? ratingValue : null;

  const firstText = questions.find((q) => q.type === "text");
  const commentValue = firstText ? answers[firstText.id] : undefined;
  const comment = typeof commentValue === "string" ? commentValue : "";

  try {
    await prisma.$transaction(async (tx) => {
      // 二重送信防止: 未回答の場合のみ respondedAt を設定
      const updated = await tx.surveyRequest.updateMany({
        where: { id: request.id, respondedAt: null },
        data: { respondedAt: new Date() },
      });
      if (updated.count === 0) throw new Error("ALREADY_RESPONDED");

      await tx.surveyResponse.create({
        data: {
          surveyId: request.surveyId,
          requestId: request.id,
          customerId: request.customerId,
          reservationId: request.reservationId,
          answers,
          rating,
          comment,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY_RESPONDED") {
      return jsonError("このアンケートは回答済みです", 409);
    }
    throw e;
  }

  return NextResponse.json({
    ok: true,
    thanksMessage: request.survey.thanksMessage || FALLBACK_THANKS,
  });
}
