"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Info,
  Scissors,
  User,
  Users,
} from "lucide-react";
import type { DayKey } from "@/lib/jst";
import { cn, formatYen } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

export type PublicService = {
  id: string;
  name: string;
  description: string;
  category: string;
  durationMin: number;
  price: number;
};

export type PublicStaff = {
  id: string;
  name: string;
  title: string;
};

export type DateOption = {
  ymd: string;
  md: string;
  dow: string;
  dayKey: DayKey;
  /** 定休日または臨時休業日（選択不可） */
  closed: boolean;
  /** 臨時休業日（ラベルの出し分けのみに使用） */
  holiday?: boolean;
  isToday: boolean;
};

type CustomerForm = {
  name: string;
  kana: string;
  phone: string;
  email: string;
  note: string;
};

const STEP_LABELS = ["メニュー", "担当者", "日時", "お客様情報", "確認"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-6 flex items-start">
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <div
                className={cn(
                  "mt-[13px] h-0.5 flex-1 rounded-full",
                  done || active ? "bg-brand" : "bg-gray-200"
                )}
              />
            )}
            <div className="flex w-[52px] shrink-0 flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  done && "bg-brand text-white",
                  active && "bg-brand text-white ring-4 ring-brand/20",
                  !done && !active && "bg-gray-200 text-gray-500"
                )}
              >
                {done ? <Check className="h-4 w-4" /> : num}
              </div>
              <span
                className={cn(
                  "text-center text-[10px] leading-tight",
                  active ? "font-semibold text-gray-900" : "text-gray-400"
                )}
              >
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function StepHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-base font-bold text-gray-900">{children}</h2>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-3 -ml-1 flex items-center gap-0.5 rounded-md px-1 py-1 text-sm text-gray-500 transition-colors hover:text-gray-800"
    >
      <ChevronLeft className="h-4 w-4" />
      戻る
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <span className="shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

export function BookingFlow({
  slug,
  storeName,
  services,
  staff,
  dates,
}: {
  slug: string;
  storeName: string;
  services: PublicService[];
  staff: PublicStaff[];
  dates: DateOption[];
}) {
  const [step, setStep] = React.useState(1);
  const [service, setService] = React.useState<PublicService | null>(null);
  // "none" = 指名なし / null = 未選択
  const [staffSel, setStaffSel] = React.useState<PublicStaff | "none" | null>(null);
  const [dateSel, setDateSel] = React.useState<DateOption | null>(null);
  const [slots, setSlots] = React.useState<string[] | null>(null);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [time, setTime] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<CustomerForm>({
    name: "",
    kana: "",
    phone: "",
    email: "",
    note: "",
  });
  const [errors, setErrors] = React.useState<Partial<Record<keyof CustomerForm, string>>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<{ publicToken: string } | null>(null);
  const fetchSeq = React.useRef(0);

  const goTo = (next: number) => {
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const resetSchedule = () => {
    setDateSel(null);
    setSlots(null);
    setTime(null);
  };

  const loadSlots = React.useCallback(
    async (d: DateOption, svc: PublicService, st: PublicStaff | "none") => {
      const seq = ++fetchSeq.current;
      setSlotsLoading(true);
      setSlots(null);
      setTime(null);
      try {
        const qs = new URLSearchParams({ date: d.ymd, serviceId: svc.id });
        if (st !== "none") qs.set("staffId", st.id);
        const res = await fetch(`/api/public/booking/${slug}/slots?${qs.toString()}`);
        const json = (await res.json()) as { slots?: string[]; error?: string };
        if (seq !== fetchSeq.current) return;
        if (!res.ok || !json.slots) {
          toast.error(json.error ?? "空き状況の取得に失敗しました。もう一度お試しください");
          setSlots([]);
        } else {
          setSlots(json.slots);
        }
      } catch {
        if (seq !== fetchSeq.current) return;
        toast.error("空き状況の取得に失敗しました。通信環境をご確認ください");
        setSlots([]);
      } finally {
        if (seq === fetchSeq.current) setSlotsLoading(false);
      }
    },
    [slug]
  );

  const selectService = (s: PublicService) => {
    if (service?.id !== s.id) resetSchedule();
    setService(s);
    goTo(2);
  };

  const selectStaff = (v: PublicStaff | "none") => {
    const prevId = staffSel === "none" ? "none" : staffSel?.id;
    const nextId = v === "none" ? "none" : v.id;
    if (prevId !== nextId) resetSchedule();
    setStaffSel(v);
    goTo(3);
  };

  const selectDate = (d: DateOption) => {
    if (!service || !staffSel || d.closed) return;
    setDateSel(d);
    void loadSlots(d, service, staffSel);
  };

  const selectTime = (t: string) => {
    setTime(t);
    goTo(4);
  };

  const validateForm = (): boolean => {
    const next: Partial<Record<keyof CustomerForm, string>> = {};
    if (!form.name.trim()) next.name = "お名前を入力してください";
    const phone = form.phone.trim();
    if (!phone) {
      next.phone = "電話番号を入力してください";
    } else if (
      phone.replace(/[^0-9]/g, "").length < 8 ||
      !/^[0-9+\-() ]+$/.test(phone)
    ) {
      next.phone = "電話番号を正しく入力してください";
    }
    const email = form.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = "メールアドレスの形式が正しくありません";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!service || !staffSel || !dateSel || !time || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/booking/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          staffId: staffSel === "none" ? null : staffSel.id,
          date: dateSel.ymd,
          time,
          name: form.name.trim(),
          kana: form.kana.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          note: form.note.trim(),
        }),
      });
      const json = (await res.json()) as { publicToken?: string; error?: string };
      if (!res.ok || !json.publicToken) {
        toast.error(json.error ?? "ご予約の送信に失敗しました。もう一度お試しください");
        if (res.status === 409 && dateSel) {
          // 埋まってしまった場合は日時選択へ戻して最新の空き状況を再取得
          goTo(3);
          void loadSlots(dateSel, service, staffSel);
        }
        return;
      }
      setDone({ publicToken: json.publicToken });
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    } catch {
      toast.error("ご予約の送信に失敗しました。通信環境をご確認ください");
    } finally {
      setSubmitting(false);
    }
  };

  const staffLabel =
    staffSel === "none" ? "指名なし" : staffSel ? staffSel.name : "";
  const dateTimeLabel =
    dateSel && time ? `${dateSel.md}(${dateSel.dow}) ${time}` : "";

  // ===== 完了画面 =====
  if (done) {
    return (
      <div className="pb-6">
        <div className="flex flex-col items-center py-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-light">
            <CheckCircle2 className="h-11 w-11 text-brand" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-gray-900">
            ご予約を受け付けました
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            ご予約ありがとうございます。
            <br />
            店舗による確認後、ご予約が確定します。
          </p>
        </div>

        <Card>
          <CardContent className="divide-y divide-gray-100 p-5">
            <SummaryRow label="メニュー" value={service?.name ?? ""} />
            <SummaryRow label="担当" value={staffLabel} />
            <SummaryRow label="日時" value={dateTimeLabel} />
            <SummaryRow
              label="料金"
              value={service ? formatYen(service.price) : ""}
            />
            <SummaryRow label="お名前" value={`${form.name.trim()} 様`} />
          </CardContent>
        </Card>

        <Link
          href={`/v/${done.publicToken}`}
          className={cn(buttonVariants({ size: "lg" }), "mt-5 w-full")}
        >
          予約の確認・キャンセルはこちら
        </Link>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-brand-light/70 p-3.5 text-xs leading-relaxed text-gray-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p>
            LINEをご連携いただいているお客様には、{storeName}
            より確認メッセージをお送りいたします。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <StepIndicator current={step} />

      {/* ===== Step 1: メニュー ===== */}
      {step === 1 && (
        <section>
          <StepHeading>メニューをお選びください</StepHeading>
          {services.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Scissors className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 text-sm text-gray-500">
                  現在ご予約いただけるメニューがございません。
                  <br />
                  恐れ入りますが、店舗まで直接お問い合わせください。
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => selectService(s)}
                  className={cn(
                    "w-full rounded-xl border bg-white p-4 text-left shadow-sm transition-all active:scale-[0.99]",
                    service?.id === s.id
                      ? "border-brand ring-2 ring-brand/30"
                      : "border-gray-200 hover:border-brand/60"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {s.category && (
                        <span className="mb-1 inline-block rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-medium text-brand-dark">
                          {s.category}
                        </span>
                      )}
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      {s.description && (
                        <p className="mt-1 text-xs leading-relaxed text-gray-500">
                          {s.description}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-300" />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      {s.durationMin}分
                    </span>
                    <span className="text-base font-bold text-gray-900">
                      {formatYen(s.price)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ===== Step 2: 担当者 ===== */}
      {step === 2 && (
        <section>
          <BackButton onClick={() => goTo(1)} />
          <StepHeading>担当者をお選びください</StepHeading>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => selectStaff("none")}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition-all active:scale-[0.99]",
                staffSel === "none"
                  ? "border-brand ring-2 ring-brand/30"
                  : "border-gray-200 hover:border-brand/60"
              )}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light">
                <Users className="h-5 w-5 text-brand" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">指名なし</p>
                <p className="mt-0.5 text-xs text-gray-500">どのスタッフでも可</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
            </button>

            {staff.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => selectStaff(m)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition-all active:scale-[0.99]",
                  staffSel !== "none" && staffSel?.id === m.id
                    ? "border-brand ring-2 ring-brand/30"
                    : "border-gray-200 hover:border-brand/60"
                )}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{m.name}</p>
                  {m.title && (
                    <p className="mt-0.5 text-xs text-gray-500">{m.title}</p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ===== Step 3: 日時 ===== */}
      {step === 3 && (
        <section>
          <BackButton onClick={() => goTo(2)} />
          <StepHeading>ご希望の日時をお選びください</StepHeading>

          <div className="-mx-4 overflow-x-auto px-4 pb-2">
            <div className="flex w-max gap-2">
              {dates.map((d) => {
                const selected = dateSel?.ymd === d.ymd;
                return (
                  <button
                    key={d.ymd}
                    type="button"
                    disabled={d.closed}
                    onClick={() => selectDate(d)}
                    className={cn(
                      "flex w-[60px] shrink-0 flex-col items-center rounded-xl border py-2.5 transition-colors",
                      selected
                        ? "border-brand bg-brand text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-900 hover:border-brand/60",
                      d.closed && "cursor-not-allowed opacity-40"
                    )}
                  >
                    <span
                      className={cn(
                        "text-[10px] font-medium",
                        selected
                          ? "text-white/90"
                          : d.dayKey === "sun"
                            ? "text-red-500"
                            : d.dayKey === "sat"
                              ? "text-sky-500"
                              : "text-gray-500"
                      )}
                    >
                      {d.isToday ? "今日" : d.dow}
                    </span>
                    <span className="mt-0.5 text-sm font-bold">{d.md}</span>
                    {d.closed && (
                      <span
                        className={cn(
                          "mt-0.5 text-[9px]",
                          selected ? "text-white/80" : "text-gray-400"
                        )}
                      >
                        {d.holiday ? "休業日" : "定休日"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            {!dateSel && (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-white py-10 text-center">
                <CalendarDays className="h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm text-gray-500">
                  日付を選択すると空き時間が表示されます
                </p>
              </div>
            )}

            {dateSel && slotsLoading && (
              <div className="flex flex-col items-center py-10">
                <Spinner className="h-7 w-7" />
                <p className="mt-3 text-sm text-gray-500">
                  空き状況を確認しています…
                </p>
              </div>
            )}

            {dateSel && !slotsLoading && slots && slots.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-white py-10 text-center">
                <p className="text-sm text-gray-500">
                  この日はご予約いただけません
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  別の日をお選びください
                </p>
              </div>
            )}

            {dateSel && !slotsLoading && slots && slots.length > 0 && (
              <>
                <p className="mb-2 text-xs font-medium text-gray-500">
                  {dateSel.md}({dateSel.dow}) の空き時間
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => selectTime(t)}
                      className={cn(
                        "rounded-lg border py-2.5 text-sm font-semibold transition-colors",
                        time === t
                          ? "border-brand bg-brand text-white"
                          : "border-gray-200 bg-white text-gray-900 hover:border-brand hover:text-brand-dark"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* ===== Step 4: お客様情報 ===== */}
      {step === 4 && (
        <section>
          <BackButton onClick={() => goTo(3)} />
          <StepHeading>お客様情報をご入力ください</StepHeading>
          <Card>
            <CardContent className="flex flex-col gap-5 p-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bk-name">
                  お名前
                  <span className="ml-1.5 rounded bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-600">
                    必須
                  </span>
                </Label>
                <Input
                  id="bk-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="山田 花子"
                  autoComplete="name"
                />
                {errors.name && (
                  <p className="text-xs text-red-600">{errors.name}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bk-kana">フリガナ</Label>
                <Input
                  id="bk-kana"
                  value={form.kana}
                  onChange={(e) => setForm({ ...form, kana: e.target.value })}
                  placeholder="ヤマダ ハナコ"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bk-phone">
                  電話番号
                  <span className="ml-1.5 rounded bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-600">
                    必須
                  </span>
                </Label>
                <Input
                  id="bk-phone"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="090-1234-5678"
                  autoComplete="tel"
                />
                {errors.phone && (
                  <p className="text-xs text-red-600">{errors.phone}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bk-email">メールアドレス</Label>
                <Input
                  id="bk-email"
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="hanako@example.com"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-xs text-red-600">{errors.email}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bk-note">ご要望・メモ</Label>
                <Textarea
                  id="bk-note"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="気になる点やご要望がございましたらご記入ください"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="mt-5 w-full"
            onClick={() => {
              if (validateForm()) goTo(5);
            }}
          >
            確認画面へ進む
          </Button>
        </section>
      )}

      {/* ===== Step 5: 確認 ===== */}
      {step === 5 && (
        <section>
          <BackButton onClick={() => goTo(4)} />
          <StepHeading>ご予約内容の確認</StepHeading>

          <Card>
            <CardContent className="divide-y divide-gray-100 p-5">
              <SummaryRow label="メニュー" value={service?.name ?? ""} />
              <SummaryRow label="担当" value={staffLabel} />
              <SummaryRow label="日時" value={dateTimeLabel} />
              <SummaryRow
                label="所要時間"
                value={service ? `${service.durationMin}分` : ""}
              />
              <SummaryRow
                label="料金"
                value={
                  <span className="text-base font-bold">
                    {service ? formatYen(service.price) : ""}
                  </span>
                }
              />
              <SummaryRow label="お名前" value={`${form.name.trim()} 様`} />
              {form.kana.trim() && (
                <SummaryRow label="フリガナ" value={form.kana.trim()} />
              )}
              <SummaryRow label="電話番号" value={form.phone.trim()} />
              {form.email.trim() && (
                <SummaryRow label="メールアドレス" value={form.email.trim()} />
              )}
              {form.note.trim() && (
                <SummaryRow
                  label="ご要望・メモ"
                  value={
                    <span className="whitespace-pre-wrap">{form.note.trim()}</span>
                  }
                />
              )}
            </CardContent>
          </Card>

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>ご予約は店舗による確認後に確定します。</p>
          </div>

          <Button
            size="lg"
            className="mt-5 w-full"
            disabled={submitting}
            onClick={() => void submit()}
          >
            {submitting && <Spinner className="h-4 w-4 text-white" />}
            {submitting ? "送信しています…" : "予約を確定する"}
          </Button>
        </section>
      )}
    </div>
  );
}
