"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { formatYen } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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

export type CustomerOption = { id: string; name: string; kana: string };
export type ServiceOption = { id: string; name: string; price: number; durationMin: number };
export type StaffOption = { id: string; name: string };

export type ReservationFormInitial = {
  id: string;
  customerId: string;
  serviceId: string | null;
  staffId: string | null;
  /** "YYYY-MM-DD"（JST） */
  date: string;
  /** "HH:mm"（JST） */
  time: string;
  price: number;
  note: string;
};

const NONE = "none";

export function ReservationForm({
  mode,
  customers,
  services,
  staffMembers,
  defaultDate,
  initial,
}: {
  mode: "create" | "edit";
  customers: CustomerOption[];
  services: ServiceOption[];
  staffMembers: StaffOption[];
  /** 新規作成時の初期日付（今日のJST） */
  defaultDate?: string;
  initial?: ReservationFormInitial;
}) {
  const router = useRouter();

  const [customerId, setCustomerId] = React.useState(initial?.customerId ?? "");
  const [serviceId, setServiceId] = React.useState(initial?.serviceId ?? NONE);
  const [staffId, setStaffId] = React.useState(initial?.staffId ?? NONE);
  const [date, setDate] = React.useState(initial?.date ?? defaultDate ?? "");
  const [time, setTime] = React.useState(initial?.time ?? "");
  const [price, setPrice] = React.useState(String(initial?.price ?? 0));
  const [note, setNote] = React.useState(initial?.note ?? "");
  const [status, setStatus] = React.useState<"CONFIRMED" | "PENDING">("CONFIRMED");

  const [slots, setSlots] = React.useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const excludeId = mode === "edit" && initial ? initial.id : null;

  // 空き枠の取得（日付・メニュー・担当の変更で再取得）
  React.useEffect(() => {
    if (!date) {
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
        if (excludeId) q.set("excludeReservationId", excludeId);
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
  }, [date, serviceId, staffId, excludeId]);

  // 編集時は現在の予約時刻も選択肢に含める（同じ日付の場合）
  const timeOptions = React.useMemo(() => {
    const set = new Set(slots);
    if (mode === "edit" && initial && date === initial.date) {
      set.add(initial.time);
    }
    return Array.from(set).sort();
  }, [slots, mode, initial, date]);

  // 選択中の時刻が選択肢から外れたらクリア
  React.useEffect(() => {
    if (time && !slotsLoading && !timeOptions.includes(time)) {
      setTime("");
    }
  }, [time, slotsLoading, timeOptions]);

  function handleServiceChange(value: string) {
    setServiceId(value);
    if (value !== NONE) {
      const service = services.find((s) => s.id === value);
      if (service) setPrice(String(service.price));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        customerId,
        serviceId: serviceId === NONE ? null : serviceId,
        staffId: staffId === NONE ? null : staffId,
        date,
        time,
        price: Math.max(0, Math.round(Number(price) || 0)),
        note,
      };
      if (mode === "create") payload.status = status;
      else payload.action = "update";

      const res = await fetch(
        mode === "create" ? "/api/reservations" : `/api/reservations/${excludeId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "保存に失敗しました");
        return;
      }
      if (mode === "create") {
        toast.success("予約を作成しました");
        router.push(`/dashboard/reservations?date=${date}`);
      } else {
        toast.success("保存しました");
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (customers.length === 0) {
    return (
      <EmptyState
        icon={<UserPlus aria-hidden="true" />}
        title="お客様がまだ登録されていません"
        description="予約を作成するには、先にお客様を登録してください。"
        action={
          <Link href="/dashboard/customers" className={buttonVariants({ size: "sm" })}>
            顧客を登録
          </Link>
        }
      />
    );
  }

  const slotPlaceholder = slotsLoading
    ? "読み込み中…"
    : timeOptions.length === 0
      ? "空き枠がありません"
      : "時刻を選択";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="reservation-form-customer">顧客</Label>
          <Select value={customerId || undefined} onValueChange={setCustomerId}>
            <SelectTrigger id="reservation-form-customer">
              <SelectValue placeholder="顧客を選択" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.kana ? `（${c.kana}）` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reservation-form-service">メニュー</Label>
          <Select value={serviceId} onValueChange={handleServiceChange}>
            <SelectTrigger id="reservation-form-service">
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

        <div className="space-y-2">
          <Label htmlFor="reservation-form-staff">担当</Label>
          <Select value={staffId} onValueChange={setStaffId}>
            <SelectTrigger id="reservation-form-staff">
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

        <div className="space-y-2">
          <Label htmlFor="reservation-date">日付</Label>
          <Input
            id="reservation-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reservation-form-time">時刻</Label>
          <Select
            key={`${date}-${serviceId}-${staffId}`}
            value={time || undefined}
            onValueChange={setTime}
            disabled={slotsLoading || timeOptions.length === 0}
          >
            <SelectTrigger id="reservation-form-time">
              <SelectValue placeholder={slotPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!slotsLoading && timeOptions.length === 0 && date && (
            <p className="text-xs text-amber-700" role="status">
              この日に空いている枠がありません。日付・メニュー・担当を変えてお試しください。
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reservation-price">料金（円）</Label>
          <Input
            id="reservation-price"
            type="number"
            min={0}
            step={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        {mode === "create" && (
          <div className="space-y-2">
            <Label htmlFor="reservation-form-status">ステータス</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v === "PENDING" ? "PENDING" : "CONFIRMED")}
            >
              <SelectTrigger id="reservation-form-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONFIRMED">確定</SelectItem>
                <SelectItem value="PENDING">未確定</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="reservation-note">メモ</Label>
          <Textarea
            id="reservation-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="施術に関するメモなど"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting
            ? mode === "create"
              ? "作成中…"
              : "保存中…"
            : mode === "create"
              ? "予約を作成"
              : "変更を保存"}
        </Button>
      </div>
    </form>
  );
}
