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

function buildSampleVars(storeName: string): TemplateVars {
  return {
    "お客様名": "山田花子",
    "店舗名": storeName,
    "予約日時": "2026年9月1日(火) 14:30",
    "メニュー名": "カット＋カラー",
    "担当者名": "佐藤",
    "前回来店日": "2026年7月15日(水)",
    "経過日数": "42",
    "クーポンリンク": "https://repinavi.example/c/sample",
    "アンケートリンク": "https://repinavi.example/s/sample",
    "予約リンク": "https://repinavi.example/r/sample",
    "予約確認リンク": "https://repinavi.example/v/sample",
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
  const [kind, setKind] = React.useState<MessageKind>(initial?.kind ?? defaultKind ?? "REMINDER");
  const [name, setName] = React.useState(initial?.name ?? "");
  const [content, setContent] = React.useState(initial?.content ?? "");
  const [saving, setSaving] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // ダイアログを開くたびに初期値へリセット
  React.useEffect(() => {
    if (open) {
      setKind(initial?.kind ?? defaultKind ?? "REMINDER");
      setName(initial?.name ?? "");
      setContent(initial?.content ?? "");
    }
  }, [open, initial, defaultKind]);

  const sampleVars = React.useMemo(() => buildSampleVars(storeName), [storeName]);
  const preview = React.useMemo(() => renderTemplate(content, sampleVars), [content, sampleVars]);

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
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + token.length;
      el.setSelectionRange(pos, pos);
    });
  }

  async function handleSave() {
    if (name.trim() === "") {
      toast.error("テンプレート名を入力してください");
      return;
    }
    if (content.trim() === "") {
      toast.error("本文を入力してください");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(initial ? `/api/templates/${initial.id}` : "/api/templates", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, name, content }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
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
          <DialogTitle>{initial ? "テンプレートを編集" : "テンプレートを作成"}</DialogTitle>
          <DialogDescription>
            {"{お客様名}"} などのプレースホルダーは、送信時にお客様ごとの内容へ自動で置き換わります。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="template-kind">種別</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as MessageKind)}>
                <SelectTrigger id="template-kind" className="mt-1.5">
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
            </div>

            <div>
              <Label htmlFor="template-name">テンプレート名</Label>
              <Input
                id="template-name"
                className="mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 前日リマインダー（丁寧版）"
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="template-content">本文</Label>
              <Textarea
                id="template-content"
                ref={textareaRef}
                className="mt-1.5"
                rows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={"{お客様名}様\n\nいつもご利用ありがとうございます。"}
              />
              <p className="mt-2 text-xs text-gray-500">クリックでカーソル位置に挿入できます</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {TEMPLATE_PLACEHOLDERS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    title={p.description}
                    onClick={() => insertPlaceholder(p.key)}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-brand/40 hover:bg-brand/10 hover:text-brand-dark"
                  >
                    {`{${p.key}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label>プレビュー</Label>
            <p className="mt-1 text-xs text-gray-500">サンプルのお客様情報で表示しています</p>
            <div className="mt-1.5 rounded-xl bg-[#8cabd8] p-4">
              <div className="mb-2 text-xs font-medium text-white/90">{storeName}</div>
              {preview.trim() === "" ? (
                <p className="py-6 text-center text-sm text-white/80">
                  本文を入力するとここに表示されます
                </p>
              ) : (
                <div className="ml-auto w-fit max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-[#06C755] px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
                  {preview}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
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
