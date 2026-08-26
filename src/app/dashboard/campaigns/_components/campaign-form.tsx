"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ticket, Users } from "lucide-react";
import { toast } from "sonner";
import type { SegmentRules } from "@/lib/segments";
import { formatNumber } from "@/lib/utils";
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

const PLACEHOLDER_CHIPS = [
  "お客様名",
  "店舗名",
  "予約リンク",
  "クーポンリンク",
] as const;
const NONE = "none";
/** LINEのテキストメッセージの上限文字数 */
const CONTENT_MAX = 5000;

type TargetMode = "segment" | "filters";
type SendMode = "draft" | "schedule" | "now";
type FieldErrors = {
  title?: string;
  content?: string;
  segment?: string;
  scheduledAt?: string;
};

/** キャンペーンの作成・編集フォーム */
export function CampaignForm({
  segments,
  coupons,
  tags,
  campaign,
  defaultSegmentId,
  defaultFilters,
}: {
  segments: SegmentOption[];
  coupons: CouponOption[];
  tags: RuleBuilderTag[];
  /** 編集対象。未指定なら新規作成 */
  campaign?: CampaignFormInitial;
  defaultSegmentId?: string;
  /** 分析レポートなどから渡される初期の抽出条件 */
  defaultFilters?: SegmentRules;
}) {
  const router = useRouter();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const initialSegmentId = campaign
    ? (campaign.segmentId ?? "")
    : defaultSegmentId && segments.some((s) => s.id === defaultSegmentId)
      ? defaultSegmentId
      : "";

  const [title, setTitle] = React.useState(campaign?.title ?? "");
  const [content, setContent] = React.useState(campaign?.content ?? "");
  const hasDefaultFilters =
    !campaign && !!defaultFilters && Object.keys(defaultFilters).length > 0;

  const [targetMode, setTargetMode] = React.useState<TargetMode>(
    campaign
      ? campaign.segmentId
        ? "segment"
        : "filters"
      : // 抽出条件を指定して開かれた場合（分析レポートの「この層に配信」など）は
        // セグメントではなく条件指定モードで開く
        hasDefaultFilters
        ? "filters"
        : initialSegmentId || segments.length > 0
          ? "segment"
          : "filters",
  );
  const [segmentId, setSegmentId] = React.useState(initialSegmentId);
  const [filters, setFilters] = React.useState<SegmentRules>(
    campaign?.filters ?? defaultFilters ?? {},
  );
  const [couponId, setCouponId] = React.useState(campaign?.couponId ?? NONE);
  const [sendMode, setSendMode] = React.useState<SendMode>(
    campaign?.status === "SCHEDULED" ? "schedule" : "draft",
  );
  const [scheduledLocal, setScheduledLocal] = React.useState(
    campaign?.scheduledAt ? isoToJstInput(campaign.scheduledAt) : "",
  );
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [submitting, setSubmitting] = React.useState(false);

  const clearError = (key: keyof FieldErrors) => {
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  // 対象人数のライブプレビュー（デバウンス）
  const selectedSegment = segments.find((s) => s.id === segmentId);
  const previewRules: SegmentRules | null =
    targetMode === "segment"
      ? selectedSegment
        ? selectedSegment.rules
        : null
      : filters;
  const previewJson =
    previewRules === null ? null : JSON.stringify(previewRules);

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
    clearError("content");
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function handleSubmit() {
    const nextErrors: FieldErrors = {};
    if (!title.trim()) nextErrors.title = "タイトルを入力してください";
    if (!content.trim()) {
      nextErrors.content = "本文を入力してください";
    } else if (content.length > CONTENT_MAX) {
      nextErrors.content = `本文は${formatNumber(CONTENT_MAX)}文字以内でご入力ください`;
    }
    if (targetMode === "segment" && !segmentId) {
      nextErrors.segment = "配信対象のセグメントを選択してください";
    }
    let scheduledAtIso: string | null = null;
    if (sendMode === "schedule") {
      scheduledAtIso = jstInputToIso(scheduledLocal);
      if (!scheduledAtIso) {
        nextErrors.scheduledAt = "配信予定日時を入力してください";
      } else if (new Date(scheduledAtIso).getTime() < Date.now()) {
        nextErrors.scheduledAt =
          "配信予定日時には現在以降の日時を指定してください";
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("入力内容をご確認ください");
      return;
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
      const res = await fetch(
        campaign ? `/api/campaigns/${campaign.id}` : "/api/campaigns",
        {
          method: campaign ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data: { id?: string; error?: string } = await res
        .json()
        .catch(() => ({}));
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
        const sendRes = await fetch(`/api/campaigns/${id}/send`, {
          method: "POST",
        });
        const sendData: { error?: string; sent?: number; skipped?: number } =
          await sendRes.json().catch(() => ({}));
        if (!sendRes.ok) {
          toast.error(
            sendData.error ??
              "配信に失敗しました。下書きとして保存されています",
          );
        } else {
          toast.success(
            `配信が完了しました（送信${formatNumber(sendData.sent ?? 0)}件・スキップ${formatNumber(
              sendData.skipped ?? 0,
            )}件）`,
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
    sendMode === "now"
      ? "今すぐ配信"
      : sendMode === "schedule"
        ? "配信を予約"
        : "下書きを保存";
  const submittingLabel =
    sendMode === "now"
      ? "配信中…"
      : sendMode === "schedule"
        ? "予約中…"
        : "保存中…";
  const remaining = CONTENT_MAX - content.length;

  return (
    <div className="max-w-3xl space-y-5">
      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle>メッセージ内容</CardTitle>
          <CardDescription>
            プレースホルダー（差し込み項目）を使うと、お客様ごとに内容を差し替えて送信されます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="campaign-title">
              タイトル
              <span className="ml-0.5 text-red-500" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="campaign-title"
              placeholder="例: 雨の日限定クーポンのご案内"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                clearError("title");
              }}
              maxLength={100}
              required
              aria-required="true"
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={
                errors.title
                  ? "campaign-title-error campaign-title-help"
                  : "campaign-title-help"
              }
            />
            {errors.title && (
              <p
                id="campaign-title-error"
                role="alert"
                className="text-xs text-red-600"
              >
                {errors.title}
              </p>
            )}
            <p id="campaign-title-help" className="text-xs text-gray-500">
              管理用の名前です。お客様には表示されません。
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="campaign-content">
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
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDER_CHIPS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={`${key}を本文に挿入`}
                  onClick={() => insertPlaceholder(key)}
                  className="rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600 transition-colors hover:border-brand hover:bg-brand/10 hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
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
              onChange={(e) => {
                setContent(e.target.value);
                clearError("content");
              }}
              required
              aria-required="true"
              aria-invalid={errors.content ? true : undefined}
              aria-describedby={
                errors.content
                  ? "campaign-content-error campaign-content-help"
                  : "campaign-content-help"
              }
            />
            {errors.content && (
              <p
                id="campaign-content-error"
                role="alert"
                className="text-xs text-red-600"
              >
                {errors.content}
              </p>
            )}
            <p id="campaign-content-help" className="text-xs text-gray-500">
              上のボタンでカーソル位置に差し込み項目を挿入できます（LINEのメッセージは
              {formatNumber(CONTENT_MAX)}文字までです）。
            </p>
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
          <fieldset>
            <legend className="sr-only">配信対象の指定方法</legend>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="campaign-target-mode"
                  className="h-4 w-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  checked={targetMode === "segment"}
                  onChange={() => setTargetMode("segment")}
                />
                保存済みセグメント
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="campaign-target-mode"
                  className="h-4 w-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  checked={targetMode === "filters"}
                  onChange={() => setTargetMode("filters")}
                />
                条件を指定
              </label>
            </div>
          </fieldset>

          {targetMode === "segment" ? (
            segments.length === 0 ? (
              <p className="text-sm text-gray-500">
                保存済みのセグメントがありません。
                <Link
                  href="/dashboard/segments"
                  className="text-brand underline-offset-4 hover:underline"
                >
                  セグメントページ
                </Link>
                から作成できます。
              </p>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="campaign-segment">
                  セグメント
                  <span className="ml-0.5 text-red-500" aria-hidden="true">
                    *
                  </span>
                </Label>
                <Select
                  value={segmentId || undefined}
                  onValueChange={(v) => {
                    setSegmentId(v);
                    clearError("segment");
                  }}
                >
                  <SelectTrigger
                    id="campaign-segment"
                    aria-required="true"
                    aria-invalid={errors.segment ? true : undefined}
                    aria-describedby={
                      errors.segment ? "campaign-segment-error" : undefined
                    }
                  >
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
                {errors.segment && (
                  <p
                    id="campaign-segment-error"
                    role="alert"
                    className="text-xs text-red-600"
                  >
                    {errors.segment}
                  </p>
                )}
              </div>
            )
          ) : (
            <div className="rounded-lg border border-gray-200 p-4">
              <RuleBuilder
                value={filters}
                onChange={setFilters}
                tags={tags}
                idPrefix="campaign-filter"
              />
            </div>
          )}

          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-lg bg-brand/5 px-4 py-3 text-sm"
          >
            <Users className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            {counting ? (
              <span className="flex items-center gap-2 text-gray-500">
                <Spinner className="h-4 w-4" />
                対象人数を計算中…
              </span>
            ) : count !== null ? (
              <span className="text-gray-700">
                対象:{" "}
                <span className="font-bold text-brand-dark">
                  {formatNumber(count)}
                </span>{" "}
                人
              </span>
            ) : (
              <span className="text-gray-500">
                {targetMode === "segment"
                  ? "セグメントを選択すると対象人数が表示されます"
                  : "条件を入力すると対象人数が表示されます"}
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
          <Label htmlFor="campaign-coupon" className="sr-only">
            添付するクーポン
          </Label>
          <Select value={couponId} onValueChange={setCouponId}>
            <SelectTrigger id="campaign-coupon">
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
              <Ticket className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{"本文に {クーポンリンク} を挿入してください。"}</span>
              <button
                type="button"
                aria-label="クーポンリンクを本文に挿入"
                onClick={() => insertPlaceholder("クーポンリンク")}
                className="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-amber-800 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
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
          <CardDescription>保存したあとの扱いを選びます。</CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset className="space-y-3">
            <legend className="sr-only">配信のタイミング</legend>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="campaign-send-mode"
                className="h-4 w-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                checked={sendMode === "draft"}
                onChange={() => setSendMode("draft")}
              />
              下書き保存
            </label>
            <div className="space-y-2">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="campaign-send-mode"
                  className="h-4 w-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                  checked={sendMode === "schedule"}
                  onChange={() => setSendMode("schedule")}
                />
                日時を指定して予約
              </label>
              {sendMode === "schedule" && (
                <div className="ml-6 space-y-1">
                  <Label htmlFor="campaign-scheduled-local" className="sr-only">
                    配信予定日時
                  </Label>
                  <Input
                    id="campaign-scheduled-local"
                    type="datetime-local"
                    className="w-fit"
                    min={nowJstInput()}
                    value={scheduledLocal}
                    onChange={(e) => {
                      setScheduledLocal(e.target.value);
                      clearError("scheduledAt");
                    }}
                    aria-invalid={errors.scheduledAt ? true : undefined}
                    aria-describedby={
                      errors.scheduledAt
                        ? "campaign-scheduled-error campaign-scheduled-help"
                        : "campaign-scheduled-help"
                    }
                  />
                  {errors.scheduledAt && (
                    <p
                      id="campaign-scheduled-error"
                      role="alert"
                      className="text-xs text-red-600"
                    >
                      {errors.scheduledAt}
                    </p>
                  )}
                  <p
                    id="campaign-scheduled-help"
                    className="text-xs text-gray-500"
                  >
                    日本時間でご指定ください。指定日時になると自動で配信されます。
                  </p>
                </div>
              )}
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="radio"
                name="campaign-send-mode"
                className="h-4 w-4 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                checked={sendMode === "now"}
                onChange={() => setSendMode("now")}
              />
              今すぐ配信
            </label>
            {sendMode === "now" && (
              <p className="ml-6 text-xs text-gray-500">
                保存後、すぐに配信を開始します。送信したメッセージは取り消せません。
              </p>
            )}
          </fieldset>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Link
          href={
            campaign
              ? `/dashboard/campaigns/${campaign.id}`
              : "/dashboard/campaigns"
          }
          className={buttonVariants({ variant: "outline" })}
        >
          キャンセル
        </Link>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </div>
  );
}
