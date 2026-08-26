"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarOff, Plus, Trash2 } from "lucide-react";
import { formatJstDate, fromJst, jstYmd } from "@/lib/jst";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { HolidayRow } from "./settings-tabs";

const NETWORK_ERROR = "通信に失敗しました。もう一度お試しください";

function HolidayItem({
  holiday,
  dimmed,
  onDelete,
  deleting,
}: {
  holiday: HolidayRow;
  dimmed?: boolean;
  onDelete: (holiday: HolidayRow) => void;
  deleting: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 py-3 ${dimmed ? "opacity-50" : ""}`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {formatJstDate(new Date(holiday.date))}
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-500">
          {holiday.reason || "理由の登録なし"}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
        disabled={deleting}
        onClick={() => onDelete(holiday)}
      >
        <Trash2 />
        削除
      </Button>
    </div>
  );
}

export function HolidaysForm({ holidays }: { holidays: HolidayRow[] }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const todayYmd = jstYmd(new Date());
  const todayStart = fromJst(todayYmd).getTime();
  const upcoming = holidays.filter((h) => new Date(h.date).getTime() >= todayStart);
  const past = holidays
    .filter((h) => new Date(h.date).getTime() < todayStart)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const add = async () => {
    if (!date) {
      toast.error("休業日の日付を選択してください");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/store/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, reason: reason.trim() }),
      });
      if (res.ok) {
        toast.success("休業日を登録しました");
        setDate("");
        setReason("");
        router.refresh();
      } else {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? "登録に失敗しました");
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (holiday: HolidayRow) => {
    const label = formatJstDate(new Date(holiday.date));
    if (!window.confirm(`${label} の休業日を削除します。よろしいですか？`)) return;

    setDeletingId(holiday.id);
    try {
      const res = await fetch(`/api/store/holidays/${holiday.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("休業日を削除しました");
        router.refresh();
      } else {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? "削除に失敗しました");
      }
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>臨時休業日</CardTitle>
        <CardDescription>
          定休日以外に店舗を閉める日を登録できます。登録した日はWeb予約ページで選択できなくなります。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5 sm:w-48">
            <Label htmlFor="holiday-date">日付</Label>
            <Input
              id="holiday-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="holiday-reason">理由（任意）</Label>
            <Input
              id="holiday-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例:「設備メンテナンスのため」"
              maxLength={200}
            />
          </div>
          <Button onClick={add} disabled={saving} className="shrink-0">
            <Plus />
            {saving ? "登録中…" : "休業日を追加"}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-gray-900">今後の休業日</h3>
          {upcoming.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 py-8 text-center">
              <CalendarOff className="h-6 w-6 text-gray-300" />
              <p className="text-sm text-gray-500">
                今後の臨時休業日は登録されていません。
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {upcoming.map((h) => (
                <HolidayItem
                  key={h.id}
                  holiday={h}
                  onDelete={remove}
                  deleting={deletingId === h.id}
                />
              ))}
            </div>
          )}
        </div>

        {past.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-gray-500">過去の休業日</h3>
            <div className="flex flex-col divide-y divide-gray-100">
              {past.map((h) => (
                <HolidayItem
                  key={h.id}
                  holiday={h}
                  dimmed
                  onDelete={remove}
                  deleting={deletingId === h.id}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
