"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { BusinessHours, BusinessHoursDay } from "@/lib/constants";
import { DAY_KEYS, DAY_LABELS_JA, type DayKey } from "@/lib/jst";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function BusinessHoursForm({ initialHours }: { initialHours: BusinessHours }) {
  const router = useRouter();
  const [hours, setHours] = useState<BusinessHours>(initialHours);
  const [saving, setSaving] = useState(false);

  const updateDay = (day: DayKey, patch: Partial<BusinessHoursDay>) => {
    setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  };

  const save = async () => {
    for (const day of DAY_KEYS) {
      const d = hours[day];
      if (!d.closed && (!d.open || !d.close)) {
        toast.error(`${DAY_LABELS_JA[day]}曜日の開店・閉店時刻を入力してください`);
        return;
      }
      if (!d.closed && d.close <= d.open) {
        toast.error(`${DAY_LABELS_JA[day]}曜日: 閉店時刻は開店時刻より後にしてください`);
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch("/api/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessHours: hours }),
      });
      if (res.ok) {
        toast.success("営業時間を保存しました");
        router.refresh();
      } else {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? "保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>営業時間</CardTitle>
        <CardDescription>
          Web予約で選択できる時間帯の計算に使用されます。定休日はオンにすると予約を受け付けません。
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col divide-y divide-gray-100">
          {DAY_KEYS.map((day) => {
            const d = hours[day];
            return (
              <div
                key={day}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:gap-6"
              >
                <div className="w-16 shrink-0 text-sm font-medium text-gray-900">
                  {DAY_LABELS_JA[day]}曜日
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id={`closed-${day}`}
                    checked={d.closed}
                    onCheckedChange={(checked) => updateDay(day, { closed: checked })}
                  />
                  <Label htmlFor={`closed-${day}`} className="cursor-pointer text-gray-600">
                    定休日
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={d.open}
                    disabled={d.closed}
                    onChange={(e) => updateDay(day, { open: e.target.value })}
                    className="w-32"
                    aria-label={`${DAY_LABELS_JA[day]}曜日の開店時刻`}
                  />
                  <span className="text-sm text-gray-400">〜</span>
                  <Input
                    type="time"
                    value={d.close}
                    disabled={d.closed}
                    onChange={(e) => updateDay(day, { close: e.target.value })}
                    className="w-32"
                    aria-label={`${DAY_LABELS_JA[day]}曜日の閉店時刻`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
