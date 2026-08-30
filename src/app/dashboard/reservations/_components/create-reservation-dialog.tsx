"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerOption, ServiceOption, StaffOption } from "./types";

const NONE = "none";

/** 時刻の指定方法（空き枠から選ぶ / 営業時間外も含めて直接入力する） */
type TimeMode = "slot" | "manual";

export function CreateReservationDialog({
  customers,
  services,
  staffMembers,
  defaultDate,
}: {
  customers: CustomerOption[];
  services: ServiceOption[];
  staffMembers: StaffOption[];
  defaultDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const [customerQuery, setCustomerQuery] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [serviceId, setServiceId] = React.useState(NONE);
  const [staffId, setStaffId] = React.useState(NONE);
  const [date, setDate] = React.useState(defaultDate);
  const [time, setTime] = React.useState("");
  const [timeMode, setTimeMode] = React.useState<TimeMode>("slot");
  const [slots, setSlots] = React.useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [price, setPrice] = React.useState("0");
  const [note, setNote] = React.useState("");

  // 空き枠の取得（日付・メニュー・担当の変更で再取得。予約編集フォームと同じAPIを使う）
  React.useEffect(() => {
    if (!open || !date) {
      setSlots([]);
      setSlotsLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      setSlotsLoading(true);
      try {
        const q = new URLSearchParams({ date });
        if (serviceId !== NONE) q.set("serviceId", serviceId);
        if (staffId !== NONE) q.set("staffId", staffId);
        const res = await fetch(`/api/reservations/slots?${q.toString()}`);
        if (!res.ok) {
          if (!cancelled) setSlots([]);
          return;
        }
        const data = (await res.json()) as { slots: string[] };
        if (!cancelled) setSlots(data.slots);
      } catch {
        if (!cancelled) setSlots([]);
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, date, serviceId, staffId]);

  // 空き枠モードで、選択中の時刻が空き枠から外れたら選択を解除する
  React.useEffect(() => {
    if (timeMode !== "slot" || slotsLoading) return;
    if (time && !slots.includes(time)) setTime("");
  }, [timeMode, slotsLoading, slots, time]);

  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null;

  const query = customerQuery.trim();
  const filteredCustomers = (
    query === ""
      ? customers
      : customers.filter((c) => c.name.includes(query) || c.kana.includes(query))
  ).slice(0, 50);

  function resetForm() {
    setCustomerQuery("");
    setCustomerId("");
    setServiceId(NONE);
    setStaffId(NONE);
    setDate(defaultDate);
    setTime("");
    setTimeMode("slot");
    setSlots([]);
    // 開いた直後に「空き枠がありません」が一瞬見えないよう、取得中から始める
    setSlotsLoading(true);
    setPrice("0");
    setNote("");
  }

  function handleTimeModeChange(value: string) {
    const next: TimeMode = value === "manual" ? "manual" : "slot";
    setTimeMode(next);
    // 空き枠モードに戻したとき、直接入力した時刻が空き枠に無ければ選択を解除する
    if (next === "slot" && time && !slots.includes(time)) setTime("");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) resetForm();
  }

  function handleServiceChange(value: string) {
    setServiceId(value);
    const service = services.find((s) => s.id === value);
    if (service) setPrice(String(service.price));
  }

  async function handleSubmit() {
    if (!customerId) {
      toast.error("顧客を選択してください");
      return;
    }
    if (!date) {
      toast.error("日付を選択してください");
      return;
    }
    if (!time) {
      toast.error("時刻を選択してください");
      return;
    }
    const priceValue = Number(price);
    if (!Number.isInteger(priceValue) || priceValue < 0) {
      toast.error("金額は0以上の整数で入力してください");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          serviceId: serviceId === NONE ? null : serviceId,
          staffId: staffId === NONE ? null : staffId,
          date,
          time,
          price: priceValue,
          note: note.trim(),
        }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(json.error ?? "予約の作成に失敗しました");
        return;
      }
      toast.success("予約を作成しました");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const slotPlaceholder = slotsLoading
    ? "読み込み中…"
    : slots.length === 0
      ? "空き枠がありません"
      : "時刻を選択";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden="true" />
          予約を作成
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>予約の作成</DialogTitle>
          <DialogDescription>
            予約を登録すると、お客様がLINE連携済みの場合は予約確認メッセージが送信されます。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* 顧客選択 */}
          <div className="grid gap-2">
            <Label htmlFor="reservation-customer-search">顧客</Label>
            <Input
              id="reservation-customer-search"
              value={customerQuery}
              onChange={(e) => setCustomerQuery(e.target.value)}
              placeholder="氏名・かなで検索"
            />
            <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200">
              {customers.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-500">
                  顧客が登録されていません。先に顧客を登録してください。
                </p>
              ) : filteredCustomers.length === 0 ? (
                <p className="px-3 py-4 text-sm text-gray-500">該当する顧客が見つかりません。</p>
              ) : (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCustomerId(c.id)}
                    aria-pressed={customerId === c.id}
                    className={cn(
                      "flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50",
                      customerId === c.id && "bg-brand/10 font-medium text-brand-dark"
                    )}
                  >
                    <span className="truncate">{c.name}</span>
                    {c.kana && <span className="shrink-0 text-xs text-gray-400">{c.kana}</span>}
                  </button>
                ))
              )}
            </div>
            <p className="text-xs text-gray-500" aria-live="polite">
              {selectedCustomer
                ? `選択中: ${selectedCustomer.name} 様`
                : "一覧からお客様を選んでください。"}
            </p>
          </div>

          {/* メニュー */}
          <div className="grid gap-2">
            <Label htmlFor="reservation-service">メニュー</Label>
            <Select value={serviceId} onValueChange={handleServiceChange}>
              <SelectTrigger id="reservation-service">
                <SelectValue placeholder="メニューを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>指定なし</SelectItem>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}（{s.durationMin}分）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedService && (
              <p className="text-xs text-gray-500">
                所要時間: {selectedService.durationMin}分（未選択の場合は60分）
              </p>
            )}
          </div>

          {/* 担当 */}
          <div className="grid gap-2">
            <Label htmlFor="reservation-staff">担当</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger id="reservation-staff">
                <SelectValue placeholder="担当を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>指名なし</SelectItem>
                {staffMembers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 日時 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="reservation-date">日付</Label>
              <Input
                id="reservation-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label
                  htmlFor={
                    timeMode === "slot" ? "reservation-time" : "reservation-time-manual"
                  }
                >
                  時刻
                </Label>
                <Tabs value={timeMode} onValueChange={handleTimeModeChange}>
                  <TabsList aria-label="時刻の指定方法" className="h-8">
                    <TabsTrigger value="slot" className="px-2 text-xs">
                      空き枠から選ぶ
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="px-2 text-xs">
                      時刻を直接入力
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {timeMode === "slot" ? (
                <>
                  <Select
                    key={`${date}-${serviceId}-${staffId}`}
                    value={time || undefined}
                    onValueChange={setTime}
                    disabled={slotsLoading || slots.length === 0}
                  >
                    <SelectTrigger id="reservation-time">
                      <SelectValue placeholder={slotPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {slots.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {date && !slotsLoading && slots.length === 0 && (
                    <p className="text-xs text-amber-700" role="status">
                      この日は空き枠がありません。日付・メニュー・担当を変えるか、「時刻を直接入力」でご登録ください。
                    </p>
                  )}
                </>
              ) : (
                <>
                  <Input
                    id="reservation-time-manual"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    aria-describedby="reservation-time-manual-help"
                  />
                  <p id="reservation-time-manual-help" className="text-xs text-gray-500">
                    営業時間外の時刻も登録できます。お電話でお受けした予約の記録などにお使いください。
                  </p>
                </>
              )}
            </div>
          </div>

          {/* 金額 */}
          <div className="grid gap-2">
            <Label htmlFor="reservation-price">金額（円）</Label>
            <Input
              id="reservation-price"
              type="number"
              min={0}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>

          {/* メモ */}
          <div className="grid gap-2">
            <Label htmlFor="reservation-note">メモ（任意）</Label>
            <Textarea
              id="reservation-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例: カラーの希望あり"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            閉じる
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={busy}>
            {busy ? "作成中…" : "作成する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
