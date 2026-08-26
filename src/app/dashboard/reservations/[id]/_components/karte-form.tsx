"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardPen, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export type KarteStaffOption = { id: string; name: string };

export type KarteRecord = {
  id: string;
  /** "YYYY-MM-DD"（JST） */
  visitedAt: string;
  /** 「2026年8月26日(水)」 */
  visitedAtLabel: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  content: string;
  materials: string;
  nextNote: string;
};

export type KarteDefaults = {
  /** "YYYY-MM-DD"（JST） */
  visitedAt: string;
  serviceName: string;
  staffId: string;
};

type KarteValues = {
  visitedAt: string;
  serviceName: string;
  /** "" は担当なし */
  staffId: string;
  content: string;
  materials: string;
  nextNote: string;
};

const STAFF_NONE = "none";

function toValues(record: KarteRecord | null, defaults: KarteDefaults): KarteValues {
  if (record) {
    return {
      visitedAt: record.visitedAt,
      serviceName: record.serviceName,
      staffId: record.staffId,
      content: record.content,
      materials: record.materials,
      nextNote: record.nextNote,
    };
  }
  return {
    visitedAt: defaults.visitedAt,
    serviceName: defaults.serviceName,
    staffId: defaults.staffId,
    content: "",
    materials: "",
    nextNote: "",
  };
}

function ReadRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800">
        {value}
      </p>
    </div>
  );
}

/** 予約詳細の施術カルテ（来店済みの予約のみ表示） */
export function ReservationKarteCard({
  reservationId,
  customerId,
  staffOptions,
  defaults,
  record,
}: {
  reservationId: string;
  customerId: string;
  staffOptions: KarteStaffOption[];
  defaults: KarteDefaults;
  record: KarteRecord | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState<KarteValues>(() => toValues(record, defaults));
  const [saving, setSaving] = React.useState(false);

  function startEditing() {
    setForm(toValues(record, defaults));
    setEditing(true);
  }

  function set<K extends keyof KarteValues>(key: K, value: KarteValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.visitedAt) {
      toast.error("来店日を入力してください");
      return;
    }
    if (!form.content.trim()) {
      toast.error("施術内容を入力してください");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        visitedAt: form.visitedAt,
        serviceName: form.serviceName.trim(),
        staffId: form.staffId || null,
        content: form.content.trim(),
        materials: form.materials,
        nextNote: form.nextNote,
      };

      const res = record
        ? await fetch(`/api/treatment-records/${record.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/treatment-records", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, customerId, reservationId }),
          });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "保存に失敗しました");
        return;
      }
      toast.success(record ? "保存しました" : "カルテを記入しました");
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>施術カルテ</CardTitle>
          <CardDescription>
            施術内容と次回への申し送りを記録します。お客様には送信されません。
          </CardDescription>
        </div>
        {record && !editing && (
          <Button variant="outline" size="sm" onClick={startEditing}>
            <Pencil />
            編集
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="reservation-karte-visited-at">
                  来店日 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="reservation-karte-visited-at"
                  type="date"
                  value={form.visitedAt}
                  onChange={(e) => set("visitedAt", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reservation-karte-service-name">メニュー名</Label>
                <Input
                  id="reservation-karte-service-name"
                  value={form.serviceName}
                  onChange={(e) => set("serviceName", e.target.value)}
                  placeholder="例: カット + カラー"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>担当スタッフ</Label>
              <Select
                value={form.staffId || STAFF_NONE}
                onValueChange={(v) => set("staffId", v === STAFF_NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STAFF_NONE}>指名なし</SelectItem>
                  {staffOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reservation-karte-content">
                施術内容 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reservation-karte-content"
                rows={4}
                value={form.content}
                onChange={(e) => set("content", e.target.value)}
                placeholder="例: 肩上10cmカット、前髪シースルー。毛量調整は表面のみ。"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reservation-karte-materials">使用薬剤・カラー剤</Label>
              <Textarea
                id="reservation-karte-materials"
                rows={3}
                value={form.materials}
                onChange={(e) => set("materials", e.target.value)}
                placeholder="例: イルミナカラー オーシャン8 + クリア 1:1、オキシ6% 20分"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reservation-karte-next-note">次回への申し送り</Label>
              <Textarea
                id="reservation-karte-next-note"
                rows={3}
                value={form.nextNote}
                onChange={(e) => set("nextNote", e.target.value)}
                placeholder="例: 次回は根元のみリタッチ。頭皮が敏感なため薬剤は地肌から離して塗布。"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "保存中..." : "保存する"}
              </Button>
            </div>
          </form>
        ) : record ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span>{record.visitedAtLabel}</span>
              {record.serviceName && <span>{record.serviceName}</span>}
              <span>担当: {record.staffName || "指名なし"}</span>
            </div>
            <ReadRow label="施術内容" value={record.content} />
            {record.materials && (
              <ReadRow label="使用薬剤・カラー剤" value={record.materials} />
            )}
            {record.nextNote && (
              <div className="rounded-lg bg-amber-50 px-3 py-2">
                <p className="text-xs font-medium text-amber-800">次回への申し送り</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-amber-900">
                  {record.nextNote}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-gray-500">
              このご来店のカルテはまだ記入されていません。
            </p>
            <Button onClick={startEditing}>
              <ClipboardPen />
              カルテを記入
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
