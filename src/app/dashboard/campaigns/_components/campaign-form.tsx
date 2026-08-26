"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ticket, Users } from "lucide-react";
import { toast } from "sonner";
import type { SegmentRules } from "@/lib/segments";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { RuleBuilder, type RuleBuilderTag } from "../../segments/rule-builder";
import { isoToJstInput, jstInputToIso, nowJstInput } from "./jst-datetime";

export type SegmentOption = { id: string; name: string; rules: SegmentRules };
export type CouponOption = { id: string; title: string };

export type CampaignFormInitial = {
  id: string;
  title: string;
  content: string;
  segmentId: string | null;
  filters: SegmentRules | null;
  couponId: string | null;
  status: "DRAFT" | "SCHEDULED";
  /** ISO文字列 */
  scheduledAt: string | null;
};

const PLACEHOLDER_CHIPS = ["お客様名", "店舗名", "予約リンク", "クーポンリンク"] as const;
const NONE = "none";

type TargetMode = "segment" | "filters";
type SendMode = "draft" | "schedule" | "now";

/** キャンペーンの作成・編集フォーム */
export function CampaignForm({
  segments,
  coupons,
  tags,
  campaign,
  defaultSegmentId,
}: {
  segments: SegmentOption[];
  coupons: CouponOption[];
  tags: RuleBuilderTag[];
  /** 編集対象。未指定なら新規作成 */
  campaign?: CampaignFormInitial;
  defaultSegmentId?: string;
}) {
  const router = useRouter();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const initialSegmentId = campaign
    ? campaign.segmentId ?? ""
    : defaultSegmentId && segments.some((s) => s.id === defaultSegmentId)
      ? defaultSegmentId
      : "";

  const [title, setTitle] = React.useState(campaign?.title ?? "");
  const [content, setContent] = React.useState(campaign?.content ?? "");
  const [targetMode, setTargetMode] = React.useState<TargetMode>(
    campaign
      ? campaign.segmentId
        ? "segment"
        : "filters"
      : initialSegmentId || segments.length > 0
        ? "segment"
        : "filters"
  );
  const [segmentId, setSegmentId] = React.useState(initialSegmentId);
  const [filters, setFilters] = React.useState<SegmentRules>(campaign?.filters ?? {});
  const [couponId, setCouponId] = React.useState(campaign?.couponId ?? NONE);
  const [sendMode, setSendMode] = React.useState<SendMode>(
    campaign?.status === "SCHEDULED" ? "schedule" : "draft"
  );
  const [scheduledLocal, setScheduledLocal] = React.useState(
    campaign?.scheduledAt ? isoToJstInput(campaign.scheduledAt) : ""
  );
  const [submitting, setSubmitting] = React.useState(false);

  // 対象人数のライブプレビュー（デバウンス）
  const selectedSegment = segments.find((s) => s.id === segmentId);
  const previewRules: SegmentRules | null =
    targetMode === "segment" ? (selectedSegment ? selectedSegment.rules : null) : filters;
  const previewJson = previewRules === null ? null : JSON.stringify(previewRules);

  const [count, setCount] = React.useState<number | null>(null);
  const [counting, setCounting] = React.useState(false);
  const seqRef = React.useRef(0);

  React.useEffect(() => {
    const seq = ++seqRef.current;
    if (previewJson === null) {
      setCount(null);
      setCounting(false);
      return;
    }
    setCounting(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/segments/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: `{"rules":${previewJson}}`,
        });
        if (!res.ok) return;
        const data: { count: number } = await res.json();
        if (seqRef.current === seq) setCount(data.count);
      } finally {
        if (seqRef.current === seq) setCounting(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [previewJson]);

  /** カーソル位置にプレースホルダーを挿入 */
  function insertPlaceholder(key: string) {
    const token = `{${key}}`;
    const el = textareaRef.current;
    if (!el) {
      setContent((c) => c + token);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? start;
    setContent(content.slice(0, start) + token + content.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function handleSubmit() {
    if (!title.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    if (!content.trim()) {
      toast.error("本文を入力してください");
      return;
    }
    if (targetMode === "segment" && !segmentId) {
      toast.error("配信対象のセグメントを選択してください");
      return;
    }
    let scheduledAtIso: string | null = null;
    if (sendMode === "schedule") {
      scheduledAtIso = jstInputToIso(scheduledLocal);
      if (!scheduledAtIso) {
        toast.error("配信予定日時を入力してください");
        return;
      }
      if (new Date(scheduledAtIso).getTime() < Date.now()) {
        toast.error("配信予定日時には現在以降の日時を指定してください");
        return;
      }
    }

    const payload = {
      title: title.trim(),
      content,
      segmentId: targetMode === "segment" ? segmentId : null,
      filters: targetMode === "filters" ? filters : null,
      couponId: couponId === NONE ? null : couponId,
      status: sendMode === "schedule" ? "SCHEDULED" : "DRAFT",
      scheduledAt: scheduledAtIso,
    };

    setSubmitting(true);
    try {
      const res = await fetch(campaign ? `/api/campaigns/${campaign.id}` : "/api/campaigns", {
        method: campaign ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: { id?: string; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "保存に失敗しました");
        return;
      }
      const id = campaign?.id ?? data.id;
      if (!id) {
        toast.error("保存に失敗しました");
        return;
      }

      if (sendMode === "now") {
        const sendRes = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
        const sendData: { error?: string; sent?: number; skipped?: number } = await sendRes
          .json()
          .catch(() => ({}));
        if (!sendRes.ok) {
          toast.error(sendData.error ?? "配信に失敗しました。下書きとして保存されています");
        } else {
          toast.success(
            `配信が完了しました（送信${sendData.sent ?? 0}件・スキップ${sendData.skipped ?? 0}件）`
          );
        }
      } else if (sendMode === "schedule") {
        toast.success("配信を予約しました");
      } else {
        toast.success("下書きを保存しました");
      }
      router.push(`/dashboard/campaigns/${id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel =
    sendMode === "now" ? "今すぐ配信" : sendMode === "schedule" ? "配信を予約" : "下書きを保存";

  return (
    <div className="max-w-3xl space-y-5">
      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>メッセージ内容</CardTitle>
          <CardDescription>
            プレースホルダーを使うと、お客様ごとに内容を差し替えて送信されます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="campaign-title">タイトル</Label>
            <Input
              id="campaign-title"
              placeholder="例: 雨の日限定クーポンのご案内"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="text-xs text-gray-400">管理用の名前です。お客様には表示されません。</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-content">本文</Label>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDER_CHIPS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => insertPlaceholder(key)}
                  className="rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 transition-colors hover:border-brand hover:bg-brand/10 hover:text-brand-dark"
                >
                  {`{${key}}`}
                </button>
              ))}
            </div>
            <Textarea
              id="campaign-content"
              ref={textareaRef}
              rows={8}
              placeholder={"{お客様名}様\n\nいつもご利用ありがとうございます。"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 配信対象 */}
      <Card>
        <CardHeader>
          <CardTitle>配信対象</CardTitle>
          <CardDescription>
            保存済みのセグメントを使うか、このキャンペーン専用の条件を指定できます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="campaign-target-mode"
                className="h-4 w-4 accent-brand"
                checked={targetMode === "segment"}
                onChange={() => setTargetMode("segment")}
              />
              保存済みセグメント
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="campaign-target-mode"
                className="h-4 w-4 accent-brand"
                checked={targetMode === "filters"}
                onChange={() => setTargetMode("filters")}
              />
              条件を指定
            </label>
          </div>

          {targetMode === "segment" ? (
            segments.length === 0 ? (
              <p className="text-sm text-gray-500">
                保存済みのセグメントがありません。
                <Link href="/dashboard/segments" className="text-brand hover:underline">
                  セグメントページ
                </Link>
                から作成できます。
              </p>
            ) : (
              <div className="space-y-1.5">
                <Label>セグメント</Label>
                <Select value={segmentId || undefined} onValueChange={setSegmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="セグメントを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {segments.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          ) : (
            <div className="rounded-lg border border-gray-200 p-4">
              <RuleBuilder value={filters} onChange={setFilters} tags={tags} />
            </div>
          )}

          <div className="flex items-center gap-2 rounded-lg bg-brand/5 px-4 py-3 text-sm">
            <Users className="h-4 w-4 text-brand" />
            {counting ? (
              <span className="flex items-center gap-2 text-gray-500">
                <Spinner className="h-4 w-4" />
                対象人数を計算しています…
              </span>
            ) : count !== null ? (
              <span className="text-gray-700">
                対象:{" "}
                <span className="font-bold text-brand-dark">{count.toLocaleString("ja-JP")}</span>{" "}
                人
              </span>
            ) : (
              <span className="text-gray-500">
                {targetMode === "segment"
                  ? "セグメントを選択すると対象人数が表示されます"
                  : "対象: －"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* クーポン */}
      <Card>
        <CardHeader>
          <CardTitle>クーポン添付</CardTitle>
          <CardDescription>
            クーポンを選ぶと、お客様ごとに発行されたクーポンのリンクを本文に差し込めます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={couponId} onValueChange={setCouponId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>なし</SelectItem>
              {coupons.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {couponId !== NONE && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Ticket className="h-4 w-4 shrink-0" />
              <span>{"本文に {クーポンリンク} を挿入してください。"}</span>
              <button
                type="button"
                onClick={() => insertPlaceholder("クーポンリンク")}
                className="rounded-md border border-amber-300 bg-white px-2 py-0.5 text-xs text-amber-800 hover:bg-amber-100"
              >
                挿入
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 配信設定 */}
      <Card>
        <CardHeader>
          <CardTitle>配信設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="campaign-send-mode"
              className="h-4 w-4 accent-brand"
              checked={sendMode === "draft"}
              onChange={() => setSendMode("draft")}
            />
            下書き保存
          </label>
          <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="campaign-send-mode"
                className="h-4 w-4 accent-brand"
                checked={sendMode === "schedule"}
                onChange={() => setSendMode("schedule")}
              />
              日時を指定して予約
            </label>
            {sendMode === "schedule" && (
              <div className="ml-6 space-y-1">
                <Input
                  type="datetime-local"
                  className="w-fit"
                  min={nowJstInput()}
                  value={scheduledLocal}
                  onChange={(e) => setScheduledLocal(e.target.value)}
                />
                <p className="text-xs text-gray-400">日本時間で指定してください。</p>
              </div>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="campaign-send-mode"
              className="h-4 w-4 accent-brand"
              checked={sendMode === "now"}
              onChange={() => setSendMode("now")}
            />
            今すぐ配信
          </label>
          {sendMode === "now" && (
            <p className="ml-6 text-xs text-gray-500">保存後、すぐに配信を開始します。</p>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Link
          href={campaign ? `/dashboard/campaigns/${campaign.id}` : "/dashboard/campaigns"}
          className={buttonVariants({ variant: "outline" })}
        >
          キャンセル
        </Link>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "保存中…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
