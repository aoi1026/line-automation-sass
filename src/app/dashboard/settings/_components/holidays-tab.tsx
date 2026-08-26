"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarOff, ChevronDown, ChevronUp, Info, Plus, Trash2 } from "lucide-react";
import { formatJstDate, jstYmd } from "@/lib/jst";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { HolidayRow } from "./settings-tabs";

type HolidayItem = {
  id: string;
  ymd: string;
  label: string;
  reason: string;
};

export function HolidaysTab({
  holidays,
  todayYmd,
}: {
  holidays: HolidayRow[];
  todayYmd: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  const { upcoming, past } = useMemo(() => {
    const items: HolidayItem[] = holidays.map((h) => {
      const d = new Date(h.date);
      return { id: h.id, ymd: jstYmd(d), label: formatJstDate(d), reason: h.reason };
    });
    return {
      upcoming: items
        .filter((i) => i.ymd >= todayYmd)
        .sort((a, b) => a.ymd.localeCompare(b.ymd)),
      past: items
        .filter((i) => i.ymd < todayYmd)
        .sort((a, b) => b.ymd.localeCompare(a.ymd)),
    };
  }, [holidays, todayYmd]);

  const add = async () => {
    if (!date) {
      toast.error("日付を選択してください");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/holidays", {
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
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: HolidayItem) => {
    if (!window.confirm(`${item.label} の休業日を削除します。よろしいですか？`)) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/holidays/${item.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("休業日を削除しました");
        router.refresh();
      } else {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? "削除に失敗しました");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const renderTable = (items: HolidayItem[], muted: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-56">日付</TableHead>
          <TableHead>理由</TableHead>
          <TableHead className="text-right">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className={muted ? "text-gray-500" : "font-medium text-gray-900"}>
              {item.label}
            </TableCell>
            <TableCell className="text-gray-700">
              {item.reason || <span className="text-gray-400">未設定</span>}
            </TableCell>
            <TableCell>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  disabled={deletingId === item.id}
                  onClick={() => remove(item)}
                >
                  <Trash2 />
                  削除
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>休業日を登録</CardTitle>
          <CardDescription>
            毎週の定休日は「営業時間」タブで設定します。ここでは研修や臨時休業など、特定の日付のお休みを登録します。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="holiday-date">日付</Label>
              <Input
                id="holiday-date"
                type="date"
                value={date}
                min={todayYmd}
                onChange={(e) => setDate(e.target.value)}
                className="sm:w-48"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor="holiday-reason">理由（任意）</Label>
              <Input
                id="holiday-reason"
                value={reason}
                maxLength={100}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例: 研修のため"
              />
            </div>
            <Button onClick={add} disabled={saving} className="shrink-0">
              <Plus />
              {saving ? "登録中…" : "追加"}
            </Button>
          </div>
          <p className="flex items-start gap-2 rounded-lg bg-brand-light px-3 py-2.5 text-sm text-gray-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
            休業日に設定した日は、Web予約ページで予約を受け付けなくなります。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>今後の休業日</CardTitle>
          <CardDescription>本日以降に設定されている休業日です。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarOff />}
              title="今後の休業日はありません"
              description="臨時のお休みが決まったら、上のフォームから登録してください。"
            />
          ) : (
            renderTable(upcoming, false)
          )}

          {past.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <Button variant="ghost" size="sm" onClick={() => setShowPast((v) => !v)}>
                {showPast ? <ChevronUp /> : <ChevronDown />}
                {showPast
                  ? "過去の休業日を隠す"
                  : `過去の休業日を表示（${past.length}件）`}
              </Button>
              {showPast && <div className="mt-3">{renderTable(past, true)}</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
