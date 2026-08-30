"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { MessageKind } from "@prisma/client";
import {
  AUTOMATION_KINDS,
  MESSAGE_KIND_LABELS,
  TEMPLATE_PLACEHOLDERS,
} from "@/lib/constants";
import { renderTemplate, type TemplateVars } from "@/lib/templates";
import { formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type TemplateFormInitial = {
  id: string;
  kind: MessageKind;
  name: string;
  content: string;
};

/** LINEのテキストメッセージの上限文字数 */
const CONTENT_MAX = 5000;

/**
 * プレビュー用のサンプル変数。
 * クーポン・アンケートは自動配信設定で紐付けたときだけ値が入るため、
 * 未設定のときの見え方も確認できるように出し分ける。
 */
/** 設定によって有無が変わるため、出し分けブロックを用意する項目 */
const OPTIONAL_BLOCK_KEYS = ["クーポンリンク", "アンケートリンク"] as const;

function buildSampleVars(storeName: string, withOptional: boolean): TemplateVars {
  const optional: TemplateVars = withOptional
    ? {
        クーポンリンク: "https://repinavi.example/c/sample",
        アンケートリンク: "https://repinavi.example/s/sample",
      }
    : {};
  return {
    ...optional,
    お客様名: "山田花子",
    店舗名: storeName,
    予約日時: "2026年9月1日(火) 14:30",
    メニュー名: "カット＋カラー",
    担当者名: "佐藤",
    前回来店日: "2026年7月15日(水)",
    経過日数: "42",
    予約リンク: "https://repinavi.example/r/sample",
    予約確認リンク: "https://repinavi.example/v/sample",
  };
}

/** テンプレートの新規作成・編集ダイアログ（プレースホルダー挿入 + LINE風プレビュー付き） */
export function TemplateFormDialog({
  open,
  onOpenChange,
  storeName,
  initial,
  defaultKind,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeName: string;
  initial?: TemplateFormInitial;
  defaultKind?: MessageKind;
}) {
  const router = useRouter();
  const [kind, setKind] = React.useState<MessageKind>(
    initial?.kind ?? defaultKind ?? "REMINDER",
  );
  const [name, setName] = React.useState(initial?.name ?? "");
  const [content, setContent] = React.useState(initial?.content ?? "");
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [contentError, setContentError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // ダイアログを開くたびに初期値へリセット
  React.useEffect(() => {
    if (open) {
      setKind(initial?.kind ?? defaultKind ?? "REMINDER");
      setName(initial?.name ?? "");
      setContent(initial?.content ?? "");
      setNameError(null);
      setContentError(null);
    }
  }, [open, initial, defaultKind]);

  const [withOptional, setWithOptional] = React.useState(true);
  const sampleVars = React.useMemo(
    () => buildSampleVars(storeName, withOptional),
    [storeName, withOptional],
  );
  const preview = React.useMemo(
    () => renderTemplate(content, sampleVars),
    [content, sampleVars],
  );
  const remaining = CONTENT_MAX - content.length;

  /** {{#キー}}…{{/キー}} の出し分けブロックを挿入する */
  function insertBlock(key: string) {
    const token = `{{#${key}}}\n{${key}}\n{{/${key}}}\n`;
    const el = textareaRef.current;
    if (!el) {
      setContent((c) => c + token);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? start;
    const next = content.slice(0, start) + token + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function insertPlaceholder(key: string) {
    const token = `{${key}}`;
    const el = textareaRef.current;
    if (!el) {
      setContent((c) => c + token);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? start;
    const next = content.slice(0, start) + token + content.slice(end);
    setContent(next);
    setContentError(null);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function handleSave() {
    let invalid = false;
    if (name.trim() === "") {
      setNameError("テンプレート名を入力してください");
      invalid = true;
    } else {
      setNameError(null);
    }
    if (content.trim() === "") {
      setContentError("本文を入力してください");
      invalid = true;
    } else if (content.length > CONTENT_MAX) {
      setContentError(
        `本文は${formatNumber(CONTENT_MAX)}文字以内でご入力ください`,
      );
      invalid = true;
    } else {
      setContentError(null);
    }
    if (invalid) {
      toast.error("入力内容をご確認ください");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        initial ? `/api/templates/${initial.id}` : "/api/templates",
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, name, content }),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "保存に失敗しました");
        return;
      }
      toast.success(initial ? "保存しました" : "テンプレートを作成しました");
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? "テンプレートを編集" : "テンプレートを作成"}
          </DialogTitle>
          <DialogDescription>
            {"{お客様名}"}{" "}
            などのプレースホルダー（差し込み項目）は、送信時にお客様ごとの内容へ自動で置き換わります。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="template-kind">種別</Label>
              <Select
                value={kind}
                onValueChange={(v) => setKind(v as MessageKind)}
              >
                <SelectTrigger
                  id="template-kind"
                  className="mt-1.5"
                  aria-describedby="template-kind-help"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AUTOMATION_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {MESSAGE_KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p id="template-kind-help" className="mt-1 text-xs text-gray-500">
                どの自動配信で使う文面かを選びます。
              </p>
            </div>

            <div>
              <Label htmlFor="template-name">
                テンプレート名
                <span className="ml-0.5 text-red-500" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="template-name"
                className="mt-1.5"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                placeholder="例: 前日リマインダー（丁寧版）"
                maxLength={100}
                required
                aria-required="true"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={
                  nameError
                    ? "template-name-error template-name-help"
                    : "template-name-help"
                }
              />
              {nameError && (
                <p
                  id="template-name-error"
                  role="alert"
                  className="mt-1 text-xs text-red-600"
                >
                  {nameError}
                </p>
              )}
              <p id="template-name-help" className="mt-1 text-xs text-gray-500">
                管理用の名前です。お客様には表示されません。
              </p>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="template-content">
                  本文
                  <span className="ml-0.5 text-red-500" aria-hidden="true">
                    *
                  </span>
                </Label>
                <span
                  aria-live="polite"
                  className={
                    remaining < 0
                      ? "text-xs font-medium text-red-600"
                      : "text-xs text-gray-400"
                  }
                >
                  残り{formatNumber(remaining)}文字
                </span>
              </div>
              <Textarea
                id="template-content"
                ref={textareaRef}
                className="mt-1.5"
                rows={10}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (contentError) setContentError(null);
                }}
                placeholder={
                  "{お客様名}様\n\nいつもご利用ありがとうございます。"
                }
                required
                aria-required="true"
                aria-invalid={contentError ? true : undefined}
                aria-describedby={
                  contentError
                    ? "template-content-error template-content-help"
                    : "template-content-help"
                }
              />
              {contentError && (
                <p
                  id="template-content-error"
                  role="alert"
                  className="mt-1 text-xs text-red-600"
                >
                  {contentError}
                </p>
              )}
              <p
                id="template-content-help"
                className="mt-2 text-xs text-gray-500"
              >
                下のボタンを押すと、カーソル位置に差し込み項目を挿入できます（LINEのメッセージは
                {formatNumber(CONTENT_MAX)}文字までです）。
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {TEMPLATE_PLACEHOLDERS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    title={p.description}
                    aria-label={`${p.key}を本文に挿入（${p.description}）`}
                    onClick={() => insertPlaceholder(p.key)}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600 transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  >
                    {`{${p.key}}`}
                  </button>
                ))}
              </div>
              <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50/60 p-2.5">
                <p className="text-xs text-gray-600">
                  クーポンやアンケートは、自動配信設定で紐付けたときだけ本文に入ります。
                  紐付けていないときに文ごと消したい場合は「出し分け」を使ってください。
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {OPTIONAL_BLOCK_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => insertBlock(key)}
                      aria-label={`${key}の出し分けブロックを挿入`}
                      className="rounded-full border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-600 transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                    >
                      {`${key}の出し分け`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-700">プレビュー</p>
              <div className="flex items-center gap-2">
                <Label htmlFor="template-preview-optional" className="text-xs text-gray-500">
                  クーポン・アンケートあり
                </Label>
                <Switch
                  id="template-preview-optional"
                  checked={withOptional}
                  onCheckedChange={setWithOptional}
                  aria-label="クーポン・アンケートを設定した場合の見え方に切り替える"
                />
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              サンプルのお客様情報で、お客様のLINE画面での見え方を表示しています。
              クーポンやアンケートを紐付けていない場合の見え方は、上の切り替えでご確認ください。
            </p>
            {/* LINEのトーク画面を模した表示（背景はLINEの標準壁紙に近い色） */}
            <div className="mt-1.5 rounded-xl bg-[#8cabd8] p-3">
              <div className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-dark"
                >
                  {(storeName || "店").slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 truncate text-xs text-white/90">
                    {storeName || "店舗名"}
                  </p>
                  {preview.trim() === "" ? (
                    <p className="rounded-2xl rounded-tl-sm bg-white/80 px-4 py-6 text-center text-sm text-gray-500">
                      本文を入力するとここに表示されます
                    </p>
                  ) : (
                    <div className="flex items-end gap-1.5">
                      <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-sm leading-relaxed text-gray-900 shadow-sm">
                        {preview}
                      </div>
                      <span className="shrink-0 text-[10px] text-white/80">
                        14:30
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中…" : initial ? "保存する" : "作成する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
