"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn, formatYen } from "@/lib/utils";
import { formatJstDate, fromJst } from "@/lib/jst";
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
import {
  buildTimeOptions,
  hmToMin,
  minToHm,
  type CustomerOption,
  type NewSlotTarget,
  type ServiceOption,
  type StaffOption,
} from "./types";

const NONE = "none";

/**
 * 空きセルをクリックしたときの新規予約ダイアログ。
 * クリックした日時・担当スタッフを初期値として渡す。
 */
export function NewReservationDialog({
  target,
  customers,
  services,
  staffMembers,
  slotIntervalMin,
  onOpenChange,
}: {
  /** null のときは閉じた状態 */
  target: NewSlotTarget | null;
  customers: CustomerOption[];
  services: ServiceOption[];
  staffMembers: StaffOption[];
  slotIntervalMin: number;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  const [customerQuery, setCustomerQuery] = React.useState("");
  const [customerId, setCustomerId] = React.useState("");
  const [serviceId, setServiceId] = React.useState(NONE);
  const [staffId, setStaffId] = React.useState(target?.staffId ?? NONE);
  const [date, setDate] = React.useState(target?.ymd ?? "");
  const [time, setTime] = React.useState(target?.time ?? "10:00");
  const [price, setPrice] = React.useState("0");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const timeOptions = React.useMemo(() => buildTimeOptions(slotIntervalMin), [slotIntervalMin]);
  const selectedService = services.find((s) => s.id === serviceId) ?? null;
  const durationMin = selectedService?.durationMin ?? 60;
  const endTime = minToHm(Math.min(24 * 60 - 1, hmToMin(time) + durationMin));

  const query = customerQuery.trim();
  const filteredCustomers = (
    query === ""
      ? customers
      : customers.filter((c) => c.name.includes(query) || c.kana.includes(query))
  ).slice(0, 50);

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
    if (!date || !time) {
      toast.error("日付と時刻を選択してください");
      return;
    }
    const priceValue = Number(price);
    if (!Number.isInteger(priceValue) || priceValue < 0) {
      toast.error("料金は0以上の整数で入力してください");
      return;
    }

    setSubmitting(true);
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
      onOpenChange(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={target !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>予約の作成</DialogTitle>
          <DialogDescription>
            {date ? `${formatJstDate(fromJst(date))} ${time}〜${endTime} に登録します。` : ""}
            お客様がLINE連携済みの場合は、予約確認メッセージが送信されます。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="calendar-customer-search">顧客</Label>
            <Input
              id="calendar-customer-search"
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
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50",
                      customerId === c.id && "bg-brand/10 font-medium text-brand-dark"
                    )}
                  >
                    <span className="truncate">{c.name}</span>
                    {c.kana && <span className="shrink-0 text-xs text-gray-400">{c.kana}</span>}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>メニュー</Label>
              <Select value={serviceId} onValueChange={handleServiceChange}>
                <SelectTrigger aria-label="メニューを選択">
                  <SelectValue placeholder="メニューを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>メニューなし</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}（{formatYen(s.price)}・{s.durationMin}分）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>担当</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger aria-label="担当を選択">
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

            <div className="grid gap-2">
              <Label htmlFor="calendar-reservation-date">日付</Label>
              <Input
                id="calendar-reservation-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>時刻</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger aria-label="時刻を選択">
                  <SelectValue placeholder="時刻を選択" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="calendar-reservation-price">料金（円）</Label>
              <Input
                id="calendar-reservation-price"
                type="number"
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="calendar-reservation-note">メモ（任意）</Label>
            <Textarea
              id="calendar-reservation-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例: カラーの希望あり"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
          <Button disabled={submitting} onClick={() => void handleSubmit()}>
            予約を作成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
