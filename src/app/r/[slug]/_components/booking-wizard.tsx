"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Check,
  ChevronLeft,
  CircleCheck,
  Clock,
  MessageCircleHeart,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { cn, formatYen } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

export type PublicService = {
  id: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
};

export type PublicStaff = {
  id: string;
  name: string;
  title: string;
};

export type DayOption = {
  ymd: string;
  day: number;
  month: number;
  weekday: string;
  /** 例: 「8月26日(水)」 */
  label: string;
  closed: boolean;
  isToday: boolean;
};

const STEPS = ["メニュー", "担当者", "日時", "お客様情報", "確認"] as const;

export function BookingWizard({
  slug,
  storeName,
  lineBasicId,
  services,
  staff,
  days,
}: {
  slug: string;
  storeName: string;
  lineBasicId: string;
  services: PublicService[];
  staff: PublicStaff[];
  days: DayOption[];
}) {
  const [step, setStep] = React.useState(1);
  const [service, setService] = React.useState<PublicService | null>(null);
  const [staffMember, setStaffMember] = React.useState<PublicStaff | null>(null);
  const [dateYmd, setDateYmd] = React.useState<string | null>(null);
  const [time, setTime] = React.useState<string | null>(null);
  const [slots, setSlots] = React.useState<string[] | null>(null);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [doneToken, setDoneToken] = React.useState<string | null>(null);

  const selectedDay = days.find((d) => d.ymd === dateYmd) ?? null;

  async function loadSlots(ymd: string, staffId: string | null) {
    if (!service) return;
    setSlotsLoading(true);
    setSlots(null);
    setTime(null);
    try {
      const params = new URLSearchParams({ slug, date: ymd, serviceId: service.id });
      if (staffId) params.set("staffId", staffId);
      const res = await fetch(`/api/public/booking/slots?${params.toString()}`);
      const data: { slots?: string[]; error?: string } = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "空き状況の取得に失敗しました");
        setSlots([]);
        return;
      }
      setSlots(data.slots ?? []);
    } catch {
      toast.error("空き状況の取得に失敗しました");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  function selectDate(day: DayOption) {
    if (day.closed) return;
    setDateYmd(day.ymd);
    void loadSlots(day.ymd, staffMember?.id ?? null);
  }

  function selectService(s: PublicService) {
    setService(s);
    // メニューが変わると所要時間が変わるため日時をリセット
    setDateYmd(null);
    setTime(null);
    setSlots(null);
    setStep(2);
  }

  function selectStaff(s: PublicStaff | null) {
    setStaffMember(s);
    setDateYmd(null);
    setTime(null);
    setSlots(null);
    setStep(3);
  }

  function submitInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("お名前を入力してください");
      return;
    }
    if (!phone.trim()) {
      toast.error("電話番号を入力してください");
      return;
    }
    setStep(5);
  }

  async function confirmBooking() {
    if (!service || !dateYmd || !time || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          serviceId: service.id,
          staffId: staffMember?.id ?? null,
          date: dateYmd,
          time,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          note: note.trim(),
        }),
      });
      const data: { ok?: boolean; token?: string; error?: string } = await res.json();
      if (!res.ok || !data.token) {
        toast.error(data.error ?? "予約に失敗しました");
        if (res.status === 409) {
          // 競合: 日時選択に戻って最新の空き状況を再取得
          setStep(3);
          if (dateYmd) void loadSlots(dateYmd, staffMember?.id ?? null);
        }
        return;
      }
      setDoneToken(data.token);
    } catch {
      toast.error("予約に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  // ===== 完了画面 =====
  if (doneToken) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <CircleCheck className="mx-auto h-12 w-12 text-brand" />
          <h2 className="mt-3 text-lg font-bold text-gray-900">ご予約ありがとうございます</h2>
          <p className="mt-1 text-sm text-gray-500">以下の内容でご予約を承りました。</p>
          <dl className="mt-5 space-y-2 rounded-lg bg-gray-50 p-4 text-left text-sm">
            <SummaryRow label="日時" value={`${selectedDay?.label ?? dateYmd} ${time}`} />
            <SummaryRow label="メニュー" value={service?.name ?? ""} />
            <SummaryRow label="担当" value={staffMember ? staffMember.name : "指名なし"} />
            <SummaryRow label="料金" value={service ? formatYen(service.price) : ""} />
            <SummaryRow label="お名前" value={`${name} 様`} />
          </dl>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/v/${doneToken}`}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              予約内容を確認する
            </Link>
            {lineBasicId && (
              <a
                href={`https://line.me/R/ti/p/${lineBasicId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-dark"
              >
                <MessageCircleHeart className="h-4 w-4" />
                LINEで通知を受け取る: 友だち追加
              </a>
            )}
          </div>
          <p className="mt-4 text-xs text-gray-400">{storeName}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ステップインジケーター */}
      <ol className="flex items-center justify-between px-1">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const current = n === step;
          const passed = n < step;
          return (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold",
                    current && "bg-brand text-white",
                    passed && "bg-brand/15 text-brand-dark",
                    !current && !passed && "bg-gray-200 text-gray-500"
                  )}
                >
                  {passed ? <Check className="h-3.5 w-3.5" /> : n}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap text-[10px]",
                    current ? "font-semibold text-gray-900" : "text-gray-400"
                  )}
                >
                  {label}
                </span>
              </div>
              {n < STEPS.length && (
                <span className={cn("mx-1 mb-4 h-px flex-1", passed ? "bg-brand/40" : "bg-gray-200")} />
              )}
            </li>
          );
        })}
      </ol>

      {/* 戻る */}
      {step > 1 && (
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4" />
          戻る
        </button>
      )}

      {/* ステップ1: メニュー選択 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>メニューを選択</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-500">
                現在ご予約いただけるメニューがありません。お手数ですが店舗までお問い合わせください。
              </p>
            )}
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectService(s)}
                className={cn(
                  "w-full rounded-xl border p-4 text-left transition-colors",
                  service?.id === s.id
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-gray-200 bg-white hover:border-brand/50"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-gray-900">{s.name}</p>
                  <p className="shrink-0 font-semibold text-gray-900">{formatYen(s.price)}</p>
                </div>
                {s.description && (
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">{s.description}</p>
                )}
                <p className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="h-3.5 w-3.5" />
                  所要時間 約{s.durationMin}分
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ステップ2: 担当者選択 */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>担当者を選択</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              type="button"
              onClick={() => selectStaff(null)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                staffMember === null
                  ? "border-brand bg-brand/5 ring-1 ring-brand"
                  : "border-gray-200 bg-white hover:border-brand/50"
              )}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <UserRound className="h-5 w-5 text-gray-400" />
              </span>
              <span>
                <span className="block font-medium text-gray-900">指名なし</span>
                <span className="block text-xs text-gray-500">当日のスタッフが担当いたします</span>
              </span>
            </button>
            {staff.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => selectStaff(s)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                  staffMember?.id === s.id
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-gray-200 bg-white hover:border-brand/50"
                )}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 font-semibold text-brand-dark">
                  {s.name.charAt(0)}
                </span>
                <span>
                  <span className="block font-medium text-gray-900">{s.name}</span>
                  {s.title && <span className="block text-xs text-gray-500">{s.title}</span>}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ステップ3: 日時選択 */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>日時を選択</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="-mx-5 overflow-x-auto px-5 pb-1">
              <div className="flex gap-2">
                {days.map((d) => {
                  const selected = dateYmd === d.ymd;
                  return (
                    <button
                      key={d.ymd}
                      type="button"
                      disabled={d.closed}
                      onClick={() => selectDate(d)}
                      className={cn(
                        "flex w-14 shrink-0 flex-col items-center rounded-xl border py-2 transition-colors",
                        selected
                          ? "border-brand bg-brand text-white"
                          : d.closed
                            ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300"
                            : "border-gray-200 bg-white text-gray-900 hover:border-brand/50"
                      )}
                    >
                      <span className={cn("text-[10px]", selected ? "text-white/80" : "text-gray-400")}>
                        {d.month}月
                      </span>
                      <span className="text-lg font-semibold leading-tight">{d.day}</span>
                      <span
                        className={cn(
                          "text-[10px]",
                          selected
                            ? "text-white/80"
                            : d.closed
                              ? "text-gray-300"
                              : d.weekday === "日"
                                ? "text-red-500"
                                : d.weekday === "土"
                                  ? "text-sky-500"
                                  : "text-gray-400"
                        )}
                      >
                        {d.closed ? "定休" : d.isToday ? "今日" : d.weekday}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!dateYmd && (
              <p className="flex items-center justify-center gap-1.5 py-6 text-sm text-gray-400">
                <Calendar className="h-4 w-4" />
                日付を選択してください
              </p>
            )}

            {dateYmd && slotsLoading && (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            )}

            {dateYmd && !slotsLoading && slots && slots.length === 0 && (
              <p className="py-6 text-center text-sm text-gray-500">この日は満席です</p>
            )}

            {dateYmd && !slotsLoading && slots && slots.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTime(t)}
                    className={cn(
                      "rounded-lg border py-2 text-sm font-medium transition-colors",
                      time === t
                        ? "border-brand bg-brand text-white"
                        : "border-gray-200 bg-white text-gray-900 hover:border-brand/50"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <Button className="w-full" size="lg" disabled={!dateYmd || !time} onClick={() => setStep(4)}>
              次へ進む
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ステップ4: お客様情報 */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>お客様情報を入力</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitInfo} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="booking-name">
                  お名前 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="booking-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="山田 花子"
                  autoComplete="name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="booking-phone">
                  電話番号 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="booking-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="090-1234-5678"
                  autoComplete="tel"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="booking-email">メールアドレス（任意）</Label>
                <Input
                  id="booking-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@example.com"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="booking-note">ご要望（任意）</Label>
                <Textarea
                  id="booking-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="ご希望やご相談があればご記入ください"
                  rows={3}
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                確認画面へ進む
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ステップ5: 確認 */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>ご予約内容の確認</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-2 rounded-lg bg-gray-50 p-4 text-sm">
              <SummaryRow label="日時" value={`${selectedDay?.label ?? dateYmd} ${time}`} />
              <SummaryRow label="メニュー" value={service?.name ?? ""} />
              <SummaryRow label="所要時間" value={service ? `約${service.durationMin}分` : ""} />
              <SummaryRow label="料金" value={service ? formatYen(service.price) : ""} />
              <SummaryRow label="担当" value={staffMember ? staffMember.name : "指名なし"} />
              <SummaryRow label="お名前" value={`${name} 様`} />
              <SummaryRow label="電話番号" value={phone} />
              {email && <SummaryRow label="メール" value={email} />}
              {note && <SummaryRow label="ご要望" value={note} />}
            </dl>
            <p className="text-xs leading-relaxed text-gray-400">
              「予約を確定する」を押すとご予約が確定します。キャンセルは予約確認ページから承ります。
            </p>
            <Button className="w-full" size="lg" onClick={confirmBooking} disabled={submitting}>
              {submitting ? "送信中..." : "予約を確定する"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-right font-medium text-gray-900">{value}</dd>
    </div>
  );
}
