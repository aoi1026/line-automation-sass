"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Cake,
  CalendarCheck,
  CalendarClock,
  Heart,
  Repeat,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { MessageKind } from "@prisma/client";
import {
  AUTOMATION_DESCRIPTIONS,
  KINDS_WITH_OFFSET,
  KINDS_WITH_SEND_HOUR,
  MESSAGE_KIND_LABELS,
} from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type AutomationSettingState = {
  enabled: boolean;
  offsetValue: number;
  offsetUnit: "hours" | "days";
  sendHourJst: number;
  templateId: string | null;
  couponId: string | null;
  surveyId: string | null;
};

type PatchBody = {
  enabled?: boolean;
  offsetValue?: number;
  offsetUnit?: "hours" | "days";
  sendHourJst?: number;
  templateId?: string | null;
  couponId?: string | null;
  surveyId?: string | null;
};

type AttachOption = { id: string; title: string; active: boolean };

/** クーポン添付を表示する種別 */
const KINDS_WITH_COUPON: MessageKind[] = ["THANKS", "REBOOKING", "BIRTHDAY"];
/** アンケート添付を表示する種別 */
const KINDS_WITH_SURVEY: MessageKind[] = ["THANKS"];

const SEND_HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7時〜21時

/** 種別ごとのアイコン */
const KIND_ICONS: Partial<Record<MessageKind, LucideIcon>> = {
  BOOKING_CONFIRMATION: CalendarCheck,
  REMINDER: Bell,
  CANCELLATION: XCircle,
  RESCHEDULE: CalendarClock,
  THANKS: Heart,
  REBOOKING: Repeat,
  BIRTHDAY: Cake,
};

/** 自動配信1種別分の設定カード */
export function AutomationCard({
  kind,
  setting,
  templates,
  coupons,
  surveys,
}: {
  kind: MessageKind;
  setting: AutomationSettingState;
  templates: { id: string; name: string }[];
  coupons: AttachOption[];
  surveys: AttachOption[];
}) {
  const router = useRouter();
  const Icon = KIND_ICONS[kind] ?? Bell;
  const [state, setState] = React.useState<AutomationSettingState>(setting);
  const [offsetText, setOffsetText] = React.useState(String(setting.offsetValue));
  const [saving, setSaving] = React.useState(false);

  // サーバー側の値が更新されたら（router.refresh後）ローカル状態を同期
  React.useEffect(() => {
    setState(setting);
    setOffsetText(String(setting.offsetValue));
  }, [setting]);

  async function patch(body: PatchBody, message = "保存しました") {
    setSaving(true);
    try {
      const res = await fetch(`/api/automations/${kind}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "保存に失敗しました");
        router.refresh();
        return;
      }
      toast.success(message);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function commitOffset() {
    const n = Math.trunc(Number(offsetText));
    if (!Number.isFinite(n) || n < 1 || n > 60) {
      toast.error("タイミングは1〜60の数値で入力してください");
      setOffsetText(String(state.offsetValue));
      return;
    }
    if (n === state.offsetValue) return;
    setState((s) => ({ ...s, offsetValue: n }));
    void patch({ offsetValue: n });
  }

  const sendHours = SEND_HOURS.includes(state.sendHourJst)
    ? SEND_HOURS
    : [state.sendHourJst, ...SEND_HOURS];

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-gray-900">{MESSAGE_KIND_LABELS[kind]}</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-500">
              {AUTOMATION_DESCRIPTIONS[kind]}
            </p>
          </div>
        </div>
        <Switch
          checked={state.enabled}
          disabled={saving}
          onCheckedChange={(checked) => {
            setState((s) => ({ ...s, enabled: checked }));
            void patch({ enabled: checked }, checked ? "有効にしました" : "無効にしました");
          }}
          aria-label={`${MESSAGE_KIND_LABELS[kind]}を有効にする`}
        />
      </div>

      {state.enabled && (
        <div className="border-t border-gray-100 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>使用テンプレート</Label>
              <Select
                value={state.templateId ?? "none"}
                onValueChange={(v) => {
                  const id = v === "none" ? null : v;
                  setState((s) => ({ ...s, templateId: id }));
                  void patch({ templateId: id });
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">標準文面</SelectItem>
                  {state.templateId && !templates.some((t) => t.id === state.templateId) && (
                    <SelectItem value={state.templateId}>（無効化されたテンプレート）</SelectItem>
                  )}
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {KINDS_WITH_OFFSET.includes(kind) && (
              <div>
                <Label htmlFor={`offset-${kind}`}>送信タイミング</Label>
                <div className="mt-1.5 flex items-center gap-2 text-sm text-gray-700">
                  <span className="shrink-0">{kind === "REMINDER" ? "予約の" : "来店の"}</span>
                  <Input
                    id={`offset-${kind}`}
                    type="number"
                    min={1}
                    max={60}
                    className="w-20"
                    value={offsetText}
                    onChange={(e) => setOffsetText(e.target.value)}
                    onBlur={commitOffset}
                  />
                  <Select
                    value={state.offsetUnit}
                    onValueChange={(v) => {
                      const unit = v === "hours" ? "hours" : "days";
                      setState((s) => ({ ...s, offsetUnit: unit }));
                      void patch({ offsetUnit: unit });
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">時間</SelectItem>
                      <SelectItem value="days">日</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="shrink-0">{kind === "REMINDER" ? "前に送信" : "後に送信"}</span>
                </div>
              </div>
            )}

            {KINDS_WITH_SEND_HOUR.includes(kind) && (
              <div>
                <Label>送信時刻</Label>
                <div className="mt-1.5 flex items-center gap-2 text-sm text-gray-700">
                  <Select
                    value={String(state.sendHourJst)}
                    onValueChange={(v) => {
                      const hour = Number(v);
                      if (!Number.isInteger(hour)) return;
                      setState((s) => ({ ...s, sendHourJst: hour }));
                      void patch({ sendHourJst: hour });
                    }}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sendHours.map((h) => (
                        <SelectItem key={h} value={String(h)}>
                          {h}時
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="shrink-0">以降に送信</span>
                </div>
              </div>
            )}

            {KINDS_WITH_COUPON.includes(kind) && (
              <div>
                <Label>クーポン添付</Label>
                <Select
                  value={state.couponId ?? "none"}
                  onValueChange={(v) => {
                    const id = v === "none" ? null : v;
                    setState((s) => ({ ...s, couponId: id }));
                    void patch({ couponId: id });
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">なし</SelectItem>
                    {coupons.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title}
                        {c.active ? "" : "（無効）"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-gray-500">
                  発行されたクーポンのURLが {"{クーポンリンク}"} に差し込まれます。
                </p>
              </div>
            )}

            {KINDS_WITH_SURVEY.includes(kind) && (
              <div>
                <Label>アンケート添付</Label>
                <Select
                  value={state.surveyId ?? "none"}
                  onValueChange={(v) => {
                    const id = v === "none" ? null : v;
                    setState((s) => ({ ...s, surveyId: id }));
                    void patch({ surveyId: id });
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">なし</SelectItem>
                    {surveys.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                        {s.active ? "" : "（無効）"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-xs text-gray-500">
                  回答ページのURLが {"{アンケートリンク}"} に差し込まれます。
                </p>
              </div>
            )}
          </div>

          {kind === "REBOOKING" && (
            <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2.5 text-xs leading-relaxed text-gray-500">
              メニューごとの推奨間隔は「設定 → メニュー管理」で変更できます。未設定のメニューは店舗デフォルト（「設定 → 店舗情報」）が使われます。
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
