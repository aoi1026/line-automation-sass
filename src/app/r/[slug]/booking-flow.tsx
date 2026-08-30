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
  Phone,
  Scissors,
  User,
  Users,
} from "lucide-react";
import type { DayKey } from "@/lib/jst";
import { cn, formatYen } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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

/** 選択肢カード共通のクラス（タップ領域44px以上・フォーカスリング付き） */
const OPTION_CARD =
  "w-full min-h-[44px] rounded-xl border bg-white text-left shadow-sm transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50";
const OPTION_SELECTED = "border-brand ring-2 ring-brand/30";
const OPTION_IDLE = "border-gray-200 hover:border-brand/60";

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-6">
      <p className="sr-only" aria-live="polite">
        全{STEP_LABELS.length}ステップ中 {current} 番目：{STEP_LABELS[current - 1]}
      </p>
      <ol className="flex items-start" aria-label="ご予約の進行状況">
        {STEP_LABELS.map((label, i) => {
          const num = i + 1;
          const done = num < current;
          const active = num === current;
          return (
            <React.Fragment key={label}>
              {i > 0 && (
                <li
                  aria-hidden="true"
                  className={cn(
                    "mt-[13px] h-0.5 flex-1 rounded-full",
                    done || active ? "bg-brand" : "bg-gray-200"
                  )}
                />
              )}
              <li
                aria-current={active ? "step" : undefined}
                className="flex w-[52px] shrink-0 flex-col items-center gap-1"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    done && "bg-brand text-white",
                    active && "bg-brand text-white ring-4 ring-brand/25",
                    !done && !active && "bg-gray-200 text-gray-500"
                  )}
                >
                  {done ? <Check aria-hidden="true" className="h-4 w-4" /> : num}
                  {done && <span className="sr-only">完了</span>}
                </span>
                <span
                  className={cn(
                    "text-center text-[10px] leading-tight",
                    active ? "font-semibold text-gray-900" : "text-gray-400"
                  )}
                >
                  {label}
                </span>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </div>
  );
}

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 -ml-2 inline-flex min-h-[44px] items-center gap-0.5 rounded-lg px-2 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
    >
      <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      戻る
      <span className="sr-only">（{label}の選択へ）</span>
    </button>
  );
}

/** 選択済みであることを示すブランド色のチェックマーク */
function SelectedMark() {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-white">
      <Check aria-hidden="true" className="h-4 w-4" />
      <span className="sr-only">選択中</span>
    </span>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

/** 入力欄の「必須」バッジ */
function RequiredMark() {
  return (
    <span className="ml-1.5 rounded bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-600">
      必須
    </span>
  );
}

export function BookingFlow({
  slug,
  storeName,
  storePhone,
  services,
  staff,
  dates,
}: {
  slug: string;
  storeName: string;
  /** 空状態で電話導線を出すための店舗電話番号（任意） */
  storePhone?: string;
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
  const [done, setDone] = React.useState<{
    publicToken: string;
    lineBasicId: string | null;
    lineLinkCode: string | null;
  } | null>(null);
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
      const json = (await res.json()) as {
        publicToken?: string;
        lineBasicId?: string | null;
        lineLinkCode?: string | null;
        error?: string;
      };
      if (!res.ok || !json.publicToken) {
        toast.error(json.error ?? "ご予約の送信に失敗しました。もう一度お試しください");
        if (res.status === 409 && dateSel) {
          // 埋まってしまった場合は日時選択へ戻して最新の空き状況を再取得
          goTo(3);
          void loadSlots(dateSel, service, staffSel);
        }
        return;
      }
      setDone({
        publicToken: json.publicToken,
        lineBasicId: json.lineBasicId ?? null,
        lineLinkCode: json.lineLinkCode ?? null,
      });
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
        <div
          role="status"
          className="flex flex-col items-center rounded-2xl bg-gradient-to-b from-brand-light to-transparent px-4 py-8 text-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-4 ring-brand/20">
            <CheckCircle2 aria-hidden="true" className="h-11 w-11 text-brand" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-gray-900">ご予約を受け付けました</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            ご予約ありがとうございます。
            <br />
            店舗による確認後、ご予約が確定します。
          </p>
        </div>

        <Card className="mt-2">
          <CardContent className="p-5">
            <dl className="divide-y divide-gray-100">
              <SummaryRow label="メニュー" value={service?.name ?? ""} />
              <SummaryRow label="担当" value={staffLabel} />
              <SummaryRow label="日時" value={dateTimeLabel} />
              <SummaryRow label="料金" value={service ? formatYen(service.price) : ""} />
              <SummaryRow label="お名前" value={`${form.name.trim()} 様`} />
            </dl>
          </CardContent>
        </Card>

        <Link
          href={`/v/${done.publicToken}`}
          className={cn(buttonVariants({ size: "lg" }), "mt-5 w-full")}
        >
          予約の確認・キャンセルはこちら
        </Link>
        <p className="mt-2 text-center text-xs leading-relaxed text-gray-500">
          このページはブックマークしておくと、あとから予約内容をご確認いただけます。
        </p>

        {done.lineBasicId && done.lineLinkCode ? (
          <section
            aria-labelledby="line-link-title"
            className="mt-5 rounded-xl border border-brand/30 bg-brand-light/60 p-4"
          >
            <h3 id="line-link-title" className="text-sm font-bold text-gray-900">
              LINEで予約のお知らせを受け取る
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
              {storeName}のLINEを友だち追加して、下の番号をトークに送っていただくと、
              予約の確認や前日のリマインドをLINEでお届けします。
            </p>

            <a
              href={`https://line.me/R/ti/p/${encodeURIComponent(done.lineBasicId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ size: "lg" }), "mt-3 w-full")}
            >
              LINEで友だち追加
            </a>

            <div className="mt-3 rounded-lg border border-dashed border-brand/40 bg-white px-3 py-2.5 text-center">
              <p className="text-xs text-gray-500">トークに送る番号</p>
              <p className="mt-0.5 font-mono text-2xl font-bold tracking-[0.3em] text-gray-900">
                {done.lineLinkCode}
              </p>
            </div>
            <p className="mt-2 text-center text-xs text-gray-500">
              この番号の有効期限は24時間です。
            </p>
          </section>
        ) : (
          <div className="mt-5 flex items-start gap-2 rounded-lg bg-brand-light/70 p-3.5 text-xs leading-relaxed text-gray-600">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            <p>
              LINEをご連携いただいているお客様には、{storeName}
              より確認メッセージをお送りいたします。
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pb-6">
      <StepIndicator current={step} />

      {/* ===== Step 1: メニュー ===== */}
      {step === 1 && (
        <section aria-labelledby="step-1-title">
          <h2 id="step-1-title" className="mb-4 text-base font-bold text-gray-900">
            メニューをお選びください
          </h2>
          {services.length === 0 ? (
            <EmptyState
              icon={<Scissors aria-hidden="true" />}
              title="ご予約いただけるメニューがありません"
              description="ただいまネット予約の準備中です。恐れ入りますが、店舗まで直接お問い合わせください。"
              action={
                storePhone ? (
                  <a
                    href={`tel:${storePhone.replace(/[^0-9+]/g, "")}`}
                    className={cn(buttonVariants(), "h-11")}
                  >
                    <Phone aria-hidden="true" />
                    店舗へ電話する
                  </a>
                ) : undefined
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {services.map((s) => {
                const selected = service?.id === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => selectService(s)}
                      aria-pressed={selected}
                      className={cn(OPTION_CARD, "p-4", selected ? OPTION_SELECTED : OPTION_IDLE)}
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
                        {selected ? (
                          <SelectedMark />
                        ) : (
                          <ChevronRight
                            aria-hidden="true"
                            className="mt-1 h-5 w-5 shrink-0 text-gray-300"
                          />
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                          {s.durationMin}分
                        </span>
                        <span className="text-base font-bold text-gray-900">
                          {formatYen(s.price)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* ===== Step 2: 担当者 ===== */}
      {step === 2 && (
        <section aria-labelledby="step-2-title">
          <BackButton label="メニュー" onClick={() => goTo(1)} />
          <h2 id="step-2-title" className="mb-4 text-base font-bold text-gray-900">
            担当者をお選びください
          </h2>
          <ul className="flex flex-col gap-3">
            <li>
              <button
                type="button"
                onClick={() => selectStaff("none")}
                aria-pressed={staffSel === "none"}
                className={cn(
                  OPTION_CARD,
                  "flex items-center gap-3 p-4",
                  staffSel === "none" ? OPTION_SELECTED : OPTION_IDLE
                )}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-light">
                  <Users aria-hidden="true" className="h-5 w-5 text-brand" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-gray-900">指名なし</span>
                  <span className="mt-0.5 block text-xs text-gray-500">どのスタッフでも可</span>
                </span>
                {staffSel === "none" ? (
                  <SelectedMark />
                ) : (
                  <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-gray-300" />
                )}
              </button>
            </li>

            {staff.map((m) => {
              const selected = staffSel !== "none" && staffSel?.id === m.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => selectStaff(m)}
                    aria-pressed={selected}
                    className={cn(
                      OPTION_CARD,
                      "flex items-center gap-3 p-4",
                      selected ? OPTION_SELECTED : OPTION_IDLE
                    )}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100">
                      <User aria-hidden="true" className="h-5 w-5 text-gray-400" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-gray-900">{m.name}</span>
                      {m.title && (
                        <span className="mt-0.5 block text-xs text-gray-500">{m.title}</span>
                      )}
                    </span>
                    {selected ? (
                      <SelectedMark />
                    ) : (
                      <ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-gray-300" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ===== Step 3: 日時 ===== */}
      {step === 3 && (
        <section aria-labelledby="step-3-title">
          <BackButton label="担当者" onClick={() => goTo(2)} />
          <h2 id="step-3-title" className="mb-4 text-base font-bold text-gray-900">
            ご希望の日時をお選びください
          </h2>

          <div
            aria-label="日付を選ぶ（横にスクロールできます）"
            className="-mx-4 snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex w-max gap-2">
              {dates.map((d) => {
                const selected = dateSel?.ymd === d.ymd;
                const closedLabel = d.holiday ? "休業日" : "定休日";
                return (
                  <button
                    key={d.ymd}
                    type="button"
                    disabled={d.closed}
                    onClick={() => selectDate(d)}
                    aria-pressed={selected}
                    aria-label={`${d.md} ${d.dow}曜日${d.isToday ? "（今日）" : ""}${
                      d.closed ? `・${closedLabel}` : ""
                    }`}
                    className={cn(
                      "flex min-h-[64px] w-[60px] shrink-0 snap-start flex-col items-center justify-center rounded-xl border py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
                      selected
                        ? "border-brand bg-brand text-white shadow-sm"
                        : "border-gray-200 bg-white text-gray-900 hover:border-brand/60",
                      d.closed && "cursor-not-allowed opacity-40"
                    )}
                  >
                    <span
                      aria-hidden="true"
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
                    <span aria-hidden="true" className="mt-0.5 text-sm font-bold">
                      {d.md}
                    </span>
                    {d.closed && (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mt-0.5 text-[9px]",
                          selected ? "text-white/80" : "text-gray-400"
                        )}
                      >
                        {closedLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            {!dateSel && (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center">
                <CalendarDays aria-hidden="true" className="h-8 w-8 text-gray-300" />
                <p className="mt-2 text-sm leading-relaxed text-gray-500">
                  上の日付をタップすると、空き時間が表示されます
                </p>
              </div>
            )}

            {dateSel && slotsLoading && (
              <div role="status" className="flex flex-col items-center py-10">
                <Spinner className="h-7 w-7" />
                <p className="mt-3 text-sm text-gray-500">空き状況を確認しています…</p>
              </div>
            )}

            {dateSel && !slotsLoading && slots && slots.length === 0 && (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center">
                <p className="text-sm font-medium text-gray-700">
                  {dateSel.md}({dateSel.dow}) は空きがございません
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  お手数ですが、別の日付をお選びください。
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
                      aria-pressed={time === t}
                      aria-label={`${dateSel.md} ${t}から`}
                      className={cn(
                        "flex min-h-[44px] items-center justify-center rounded-lg border px-1 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50",
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
        <section aria-labelledby="step-4-title">
          <BackButton label="日時" onClick={() => goTo(3)} />
          <h2 id="step-4-title" className="mb-4 text-base font-bold text-gray-900">
            お客様情報をご入力ください
          </h2>
          <Card>
            <CardContent className="flex flex-col gap-5 p-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bk-name">
                  お名前
                  <RequiredMark />
                </Label>
                <Input
                  id="bk-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="山田 花子"
                  autoComplete="name"
                  aria-required="true"
                  aria-invalid={errors.name ? true : undefined}
                  aria-describedby={errors.name ? "bk-name-error" : undefined}
                />
                {errors.name && (
                  <p id="bk-name-error" role="alert" className="text-xs text-red-600">
                    {errors.name}
                  </p>
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
                  <RequiredMark />
                </Label>
                <Input
                  id="bk-phone"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="090-1234-5678"
                  autoComplete="tel"
                  aria-required="true"
                  aria-invalid={errors.phone ? true : undefined}
                  aria-describedby={errors.phone ? "bk-phone-error" : undefined}
                />
                {errors.phone && (
                  <p id="bk-phone-error" role="alert" className="text-xs text-red-600">
                    {errors.phone}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bk-email">メールアドレス</Label>
                <Input
                  id="bk-email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="hanako@example.com"
                  autoComplete="email"
                  aria-invalid={errors.email ? true : undefined}
                  aria-describedby={errors.email ? "bk-email-error" : undefined}
                />
                {errors.email && (
                  <p id="bk-email-error" role="alert" className="text-xs text-red-600">
                    {errors.email}
                  </p>
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
        <section aria-labelledby="step-5-title">
          <BackButton label="お客様情報" onClick={() => goTo(4)} />
          <h2 id="step-5-title" className="mb-4 text-base font-bold text-gray-900">
            ご予約内容の確認
          </h2>

          <Card>
            <CardContent className="p-5">
              <dl className="divide-y divide-gray-100">
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
                {form.kana.trim() && <SummaryRow label="フリガナ" value={form.kana.trim()} />}
                <SummaryRow label="電話番号" value={form.phone.trim()} />
                {form.email.trim() && (
                  <SummaryRow label="メールアドレス" value={form.email.trim()} />
                )}
                {form.note.trim() && (
                  <SummaryRow
                    label="ご要望・メモ"
                    value={<span className="whitespace-pre-wrap">{form.note.trim()}</span>}
                  />
                )}
              </dl>
            </CardContent>
          </Card>

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
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
          <p className="mt-2 text-center text-xs text-gray-500">
            内容を修正する場合は「戻る」からお進みください。
          </p>
        </section>
      )}
    </div>
  );
}
