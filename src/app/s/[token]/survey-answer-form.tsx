"use client";

import * as React from "react";
import { CheckCircle2, ClipboardX, Star } from "lucide-react";
import { toast } from "sonner";
import {
  RATING_LABELS,
  type SurveyQuestion,
} from "@/app/api/surveys/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

/** 「必須」バッジ（読み上げ時も必須と伝わるようにする） */
function RequiredMark() {
  return (
    <span className="ml-1.5 rounded bg-red-100 px-1 py-0.5 align-middle text-[10px] font-medium text-red-600">
      必須
    </span>
  );
}

/** アンケート回答フォーム（公開ページ /s/[token]） */
export function SurveyAnswerForm({
  token,
  storeName,
  surveyTitle,
  surveyDescription,
  questions,
  fallbackThanksMessage,
}: {
  token: string;
  storeName: string;
  surveyTitle: string;
  surveyDescription: string;
  questions: SurveyQuestion[];
  fallbackThanksMessage: string;
}) {
  const [answers, setAnswers] = React.useState<Record<string, number | string>>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [thanksMessage, setThanksMessage] = React.useState<string | null>(null);

  function setAnswer(questionId: string, value: number | string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => {
      if (!(questionId in prev)) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors: Record<string, string> = {};
    for (const question of questions) {
      if (!question.required) continue;
      const value = answers[question.id];
      if (question.type === "text") {
        if (typeof value !== "string" || value.trim() === "") {
          nextErrors[question.id] = "こちらの質問は必須です。ご回答をお願いいたします。";
        }
      } else if (value === undefined || value === "") {
        nextErrors[question.id] =
          question.type === "rating"
            ? "星をタップして評価をお選びください。"
            : "いずれかの選択肢をお選びください。";
      }
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      toast.error("未回答の必須項目があります。ご確認をお願いいたします。");
      // 最初の未回答までスクロールして、どこを直せばよいかすぐ分かるようにする
      const firstId = questions.find((q) => q.id in nextErrors)?.id;
      if (firstId && typeof document !== "undefined") {
        document
          .getElementById(`q-${firstId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/surveys/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; thanksMessage?: string; error?: string }
        | null;
      if (!res.ok) {
        toast.error(data?.error ?? "送信に失敗しました。もう一度お試しください。");
        return;
      }
      setThanksMessage(data?.thanksMessage || fallbackThanksMessage || "ご回答ありがとうございました。");
    } finally {
      setSubmitting(false);
    }
  }

  if (thanksMessage !== null) {
    return (
      <Card>
        <CardContent className="p-8 text-center" role="status">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-light">
            <CheckCircle2 aria-hidden="true" className="h-11 w-11 text-brand" />
          </div>
          <h1 className="mt-5 text-lg font-bold text-gray-900">回答を送信しました</h1>
          <p className="mt-1.5 text-sm text-gray-500">ご協力ありがとうございました。</p>
          <p className="mt-4 whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-left text-sm leading-relaxed text-gray-600">
            {thanksMessage}
          </p>
          <p className="mt-6 text-sm font-medium text-gray-700">{storeName}</p>
        </CardContent>
      </Card>
    );
  }

  if (questions.length === 0) {
    return (
      <Card className="mt-8">
        <CardContent className="p-8 text-center">
          <ClipboardX aria-hidden="true" className="mx-auto h-12 w-12 text-gray-300" />
          <h1 className="mt-4 text-lg font-bold text-gray-900">
            アンケートが見つかりませんでした
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            現在このアンケートはご回答いただけません。
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-lg font-bold text-gray-900">{surveyTitle}</h1>
      {surveyDescription !== "" && (
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-gray-500">
          {surveyDescription}
        </p>
      )}
      <p className="mt-2 text-xs text-gray-400">
        全{questions.length}問・
        <span className="text-red-600">必須</span>
        の項目はご回答をお願いいたします。
      </p>

      <div className="mt-5 flex flex-col gap-4">
        {questions.map((question, index) => {
          const value = answers[question.id];
          const error = errors[question.id];
          const labelId = `q-${question.id}-label`;
          const errorId = `q-${question.id}-error`;
          return (
            <Card key={question.id} id={`q-${question.id}`} className="scroll-mt-6">
              <CardContent className="p-4">
                {question.type === "text" ? (
                  <label
                    id={labelId}
                    htmlFor={`q-${question.id}-input`}
                    className="block text-sm font-medium text-gray-900"
                  >
                    <span className="text-gray-400">Q{index + 1}. </span>
                    {question.label}
                    {question.required && <RequiredMark />}
                  </label>
                ) : (
                  <p id={labelId} className="text-sm font-medium text-gray-900">
                    <span className="text-gray-400">Q{index + 1}. </span>
                    {question.label}
                    {question.required && <RequiredMark />}
                  </p>
                )}

                {question.type === "rating" && (
                  <div
                    role="group"
                    aria-labelledby={labelId}
                    aria-describedby={error ? errorId : undefined}
                    className="mt-3"
                  >
                    <div className="flex justify-between gap-1">
                      {[1, 2, 3, 4, 5].map((score) => {
                        const filled = typeof value === "number" && score <= value;
                        const exact = value === score;
                        return (
                          <button
                            key={score}
                            type="button"
                            onClick={() => setAnswer(question.id, score)}
                            aria-pressed={exact}
                            aria-label={`${score}・${RATING_LABELS[score]}`}
                            className={cn(
                              "flex min-h-[56px] flex-1 flex-col items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
                              exact ? "bg-amber-50" : "hover:bg-gray-50"
                            )}
                          >
                            <Star
                              aria-hidden="true"
                              className={cn(
                                "h-10 w-10 transition-colors",
                                filled ? "fill-amber-400 text-amber-400" : "text-gray-300"
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-center text-sm font-medium text-gray-700">
                      {typeof value === "number" ? (
                        RATING_LABELS[value]
                      ) : (
                        <span className="text-xs font-normal text-gray-400">
                          星をタップして評価してください（1: {RATING_LABELS[1]} 〜 5:{" "}
                          {RATING_LABELS[5]}）
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {question.type === "choice" && (
                  <div
                    role="group"
                    aria-labelledby={labelId}
                    aria-describedby={error ? errorId : undefined}
                    className="mt-3 flex flex-col gap-2"
                  >
                    {(question.options ?? []).map((option) => {
                      const selected = value === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setAnswer(question.id, option)}
                          aria-pressed={selected}
                          className={cn(
                            "flex min-h-[48px] w-full items-center gap-2.5 rounded-lg border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
                            selected
                              ? "border-brand bg-brand/5 font-medium text-brand-dark"
                              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                              selected ? "border-brand" : "border-gray-300"
                            )}
                          >
                            {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                          </span>
                          {option}
                        </button>
                      );
                    })}
                  </div>
                )}

                {question.type === "text" && (
                  <Textarea
                    id={`q-${question.id}-input`}
                    className="mt-3"
                    rows={4}
                    maxLength={2000}
                    placeholder="ご自由にご記入ください"
                    value={typeof value === "string" ? value : ""}
                    onChange={(e) => setAnswer(question.id, e.target.value)}
                    aria-required={question.required || undefined}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                  />
                )}

                {error && (
                  <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-red-600">
                    {error}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting}>
        {submitting ? "送信中…" : "回答を送信"}
      </Button>
      <p className="mt-2 text-center text-xs leading-relaxed text-gray-500">
        いただいたご回答は{storeName}のサービス向上のために活用いたします。
      </p>
    </form>
  );
}
