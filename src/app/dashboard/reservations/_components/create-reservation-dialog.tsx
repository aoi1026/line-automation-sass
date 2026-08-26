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
import { Textarea } from "@/components/ui/textarea";
import {
  TIME_OPTIONS,
  type CustomerOption,
  type ServiceOption,
  type StaffOption,
} from "./types";

const NONE = "none";

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
  const [time, setTime] = React.useState("10:00");
  const [price, setPrice] = React.useState("0");
  const [note, setNote] = React.useState("");

  const selectedService = services.find((s) => s.id === serviceId) ?? null;

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
    setTime("10:00");
    setPrice("0");
    setNote("");
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
    if (!date || !time) {
      toast.error("日付と時刻を入力してください");
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
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

          {/* メニュー */}
          <div className="grid gap-2">
            <Label>メニュー</Label>
            <Select value={serviceId} onValueChange={handleServiceChange}>
              <SelectTrigger aria-label="メニューを選択">
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
            <Label>担当</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger aria-label="担当スタッフを選択">
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
              <Label>時刻</Label>
              <Select value={time} onValueChange={setTime}>
                <SelectTrigger aria-label="時刻を選択">
                  <SelectValue placeholder="時刻を選択" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            作成する
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
