"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Smartphone, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  QUESTION_TYPE_LABELS,
  RATING_LABELS,
  type QuestionType,
  type SurveyQuestion,
} from "@/app/api/surveys/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type SurveyFormInitial = {
  title: string;
  description: string;
  thanksMessage: string;
  questions: SurveyQuestion[];
};

/** 編集中の質問（入力途中の空文字を許容する） */
type EditableQuestion = {
  id: string;
  type: QuestionType;
  label: string;
  options: string[];
  required: boolean;
};

const QUESTION_TYPES: QuestionType[] = ["rating", "choice", "text"];

function toEditable(questions: SurveyQuestion[]): EditableQuestion[] {
  return questions.map((q) => ({
    id: q.id,
    type: q.type,
    label: q.label,
    options: q.options ?? [],
    required: q.required ?? false,
  }));
}

export function SurveyForm({
  surveyId,
  storeName,
  initial,
}: {
  /** 指定時は編集（PATCH）、未指定時は新規作成（POST） */
  surveyId?: string;
  storeName: string;
  initial: SurveyFormInitial;
}) {
  const router = useRouter();
  const isEdit = surveyId !== undefined;

  const [title, setTitle] = React.useState(initial.title);
  const [description, setDescription] = React.useState(initial.description);
  const [thanksMessage, setThanksMessage] = React.useState(initial.thanksMessage);
  const [questions, setQuestions] = React.useState<EditableQuestion[]>(() =>
    toEditable(initial.questions)
  );
  const [saving, setSaving] = React.useState(false);

  function updateQuestion(index: number, patch: Partial<EditableQuestion>) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: "text", label: "", options: [], required: false },
    ]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setQuestions((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function changeType(index: number, type: QuestionType) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q;
        // 選択式に変更したとき、選択肢が空なら入力欄を2つ用意する
        const options = type === "choice" && q.options.length === 0 ? ["", ""] : q.options;
        return { ...q, type, options };
      })
    );
  }

  function updateOption(qIndex: number, oIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q
      )
    );
  }

  function addOption(qIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIndex ? { ...q, options: [...q.options, ""] } : q))
    );
  }

  function removeOption(qIndex: number, oIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIndex ? { ...q, options: q.options.filter((_, j) => j !== oIndex) } : q
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (title.trim() === "") {
      toast.error("タイトルを入力してください");
      return;
    }
    if (questions.length === 0) {
      toast.error("質問を1つ以上追加してください");
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.label.trim() === "") {
        toast.error(`質問${i + 1}の質問文を入力してください`);
        return;
      }
      if (q.type === "choice" && q.options.every((o) => o.trim() === "")) {
        toast.error(`質問${i + 1}に選択肢を1つ以上入力してください`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        thanksMessage: thanksMessage.trim(),
        questions: questions.map((q) => ({
          id: q.id,
          type: q.type,
          label: q.label.trim(),
          ...(q.type === "choice"
            ? { options: q.options.map((o) => o.trim()).filter((o) => o !== "") }
            : {}),
          required: q.required,
        })),
      };
      const res = await fetch(isEdit ? `/api/surveys/${surveyId}` : "/api/surveys", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "保存に失敗しました");
        return;
      }
      toast.success(isEdit ? "保存しました" : "アンケートを作成しました");
      router.push("/dashboard/surveys");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
            <CardDescription>お客様に表示されるタイトルと説明を設定します。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="survey-title">タイトル</Label>
              <Input
                id="survey-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: ご来店後アンケート"
                maxLength={100}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="survey-description">説明</Label>
              <Textarea
                id="survey-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例: 今後のサービス向上のため、ご意見をお聞かせください。"
                rows={2}
                maxLength={1000}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="survey-thanks">回答後メッセージ</Label>
              <Textarea
                id="survey-thanks"
                value={thanksMessage}
                onChange={(e) => setThanksMessage(e.target.value)}
                placeholder="例: ご回答ありがとうございました。"
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-gray-500">回答送信後の画面に表示されます。</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>質問</CardTitle>
            <CardDescription>質問は上から順に表示されます。</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {questions.map((q, index) => (
              <div key={q.id} className="rounded-lg border border-gray-200 bg-gray-50/50 p-4">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-sm font-semibold text-gray-500">
                    質問{index + 1}
                  </span>
                  <Select
                    value={q.type}
                    onValueChange={(v) => changeType(index, v as QuestionType)}
                  >
                    <SelectTrigger className="h-8 w-32 bg-white text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {QUESTION_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex items-center gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveQuestion(index, -1)}
                      disabled={index === 0}
                      aria-label="上に移動"
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveQuestion(index, 1)}
                      disabled={index === questions.length - 1}
                      aria-label="下に移動"
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-600"
                      onClick={() => removeQuestion(index)}
                      aria-label="質問を削除"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>

                <Input
                  className="mt-3 bg-white"
                  value={q.label}
                  onChange={(e) => updateQuestion(index, { label: e.target.value })}
                  placeholder="質問文を入力"
                  maxLength={200}
                />

                {q.type === "choice" && (
                  <div className="mt-3 flex flex-col gap-2">
                    {q.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-gray-300 bg-white" />
                        <Input
                          className="h-8 bg-white text-sm"
                          value={option}
                          onChange={(e) => updateOption(index, oIndex, e.target.value)}
                          placeholder={`選択肢${oIndex + 1}`}
                          maxLength={100}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-gray-400 hover:text-red-600"
                          onClick={() => removeOption(index, oIndex)}
                          aria-label="選択肢を削除"
                        >
                          <X />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="self-start bg-white"
                      onClick={() => addOption(index)}
                    >
                      <Plus />
                      選択肢を追加
                    </Button>
                  </div>
                )}

                <label className="mt-3 flex w-fit cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={q.required}
                    onCheckedChange={(checked) =>
                      updateQuestion(index, { required: checked === true })
                    }
                  />
                  <span className="text-sm text-gray-700">必須にする</span>
                </label>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addQuestion}>
              <Plus />
              質問を追加
            </Button>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/dashboard/surveys")}
            disabled={saving}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "保存中…" : isEdit ? "保存" : "アンケートを作成"}
          </Button>
        </div>
      </form>

      <div className="lg:sticky lg:top-6">
        <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-gray-500">
          <Smartphone className="h-4 w-4" />
          プレビュー（お客様に表示される画面）
        </div>
        <div className="overflow-hidden rounded-3xl border-4 border-gray-200 bg-gray-50 shadow-sm">
          <div className="border-b border-gray-200 bg-white px-4 py-3 text-center">
            <span className="text-sm font-bold text-gray-900">
              {storeName || "店舗名"}
            </span>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-4 py-5">
            <h2 className="text-base font-bold text-gray-900">
              {title.trim() || "アンケートタイトル"}
            </h2>
            {description.trim() !== "" && (
              <p className="mt-1.5 whitespace-pre-wrap text-xs text-gray-500">{description}</p>
            )}

            <div className="mt-4 flex flex-col gap-3">
              {questions.length === 0 && (
                <p className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center text-xs text-gray-400">
                  質問を追加するとここに表示されます
                </p>
              )}
              {questions.map((q, index) => (
                <div key={q.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-sm font-medium text-gray-900">
                    {q.label.trim() || `質問${index + 1}`}
                    {q.required && <span className="ml-1 text-xs text-red-500">必須</span>}
                  </p>

                  {q.type === "rating" && (
                    <div className="mt-3">
                      <div className="flex justify-between">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <Star
                            key={v}
                            className={cn(
                              "h-8 w-8",
                              v <= 4 ? "fill-amber-400 text-amber-400" : "text-gray-300"
                            )}
                          />
                        ))}
                      </div>
                      <div className="mt-1 flex justify-between text-[10px] text-gray-400">
                        <span>{RATING_LABELS[1]}</span>
                        <span>{RATING_LABELS[5]}</span>
                      </div>
                    </div>
                  )}

                  {q.type === "choice" && (
                    <div className="mt-3 flex flex-col gap-2">
                      {(q.options.some((o) => o.trim() !== "")
                        ? q.options.filter((o) => o.trim() !== "")
                        : ["選択肢を追加してください"]
                      ).map((option, oIndex) => (
                        <div
                          key={oIndex}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs",
                            oIndex === 0
                              ? "border-brand bg-brand/5 font-medium text-brand-dark"
                              : "border-gray-200 text-gray-700"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
                              oIndex === 0 ? "border-brand" : "border-gray-300"
                            )}
                          >
                            {oIndex === 0 && (
                              <span className="h-2 w-2 rounded-full bg-brand" />
                            )}
                          </span>
                          {option}
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === "text" && (
                    <div className="mt-3 h-16 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-400">
                      ご自由にご記入ください
                    </div>
                  )}
                </div>
              ))}

              {questions.length > 0 && (
                <div className="rounded-lg bg-brand py-3 text-center text-sm font-medium text-white">
                  回答を送信
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
