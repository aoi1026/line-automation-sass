import { z } from "zod";

/**
 * アンケート質問定義（Survey.questions Json）の共有スキーマ。
 * 形式: [{ id: string, type: "rating"|"choice"|"text", label: string, options?: string[], required?: boolean }]
 */

export const questionTypeSchema = z.enum(["rating", "choice", "text"]);
export type QuestionType = z.infer<typeof questionTypeSchema>;

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  rating: "★評価",
  choice: "選択式",
  text: "自由記述",
};

/** 評価値（1〜5）の表示ラベル */
export const RATING_LABELS: Record<number, string> = {
  5: "とても満足",
  4: "満足",
  3: "普通",
  2: "やや不満",
  1: "不満",
};

export const surveyQuestionSchema = z
  .object({
    id: z.string().trim().min(1, "質問IDが不正です"),
    type: questionTypeSchema,
    label: z
      .string()
      .trim()
      .min(1, "質問文を入力してください")
      .max(200, "質問文は200文字以内で入力してください"),
    options: z
      .array(
        z
          .string()
          .trim()
          .min(1, "選択肢を入力してください")
          .max(100, "選択肢は100文字以内で入力してください")
      )
      .max(20, "選択肢は20個以内にしてください")
      .optional(),
    required: z.boolean().optional(),
  })
  .superRefine((question, ctx) => {
    if (question.type === "choice" && (!question.options || question.options.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["options"],
        message: "選択式の質問には選択肢を1つ以上追加してください",
      });
    }
  });

export type SurveyQuestion = z.infer<typeof surveyQuestionSchema>;

export const surveyQuestionsSchema = z
  .array(surveyQuestionSchema)
  .min(1, "質問を1つ以上追加してください")
  .max(20, "質問は20個以内にしてください")
  .superRefine((questions, ctx) => {
    const ids = new Set<string>();
    for (const question of questions) {
      if (ids.has(question.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "質問IDが重複しています" });
        return;
      }
      ids.add(question.id);
    }
  });

/** DBのJson値から質問定義を安全にパース（不正な形式は空配列） */
export function parseSurveyQuestions(raw: unknown): SurveyQuestion[] {
  const result = surveyQuestionsSchema.safeParse(raw);
  return result.success ? result.data : [];
}

/** SurveyResponse.answers（{ [questionId]: number | string }）を安全にパース */
export function parseSurveyAnswers(raw: unknown): Record<string, number | string> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const answers: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "number" || typeof value === "string") answers[key] = value;
  }
  return answers;
}
