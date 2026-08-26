"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { jstYmd } from "@/lib/jst";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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

export type StaffOption = { id: string; name: string };

export type KarteFormValues = {
  /** "YYYY-MM-DD"（JST） */
  visitedAt: string;
  serviceName: string;
  /** "" は担当なし */
  staffId: string;
  content: string;
  materials: string;
  nextNote: string;
};

export const STAFF_NONE = "none";

function blankValues(): KarteFormValues {
  return {
    visitedAt: jstYmd(new Date()),
    serviceName: "",
    staffId: "",
    content: "",
    materials: "",
    nextNote: "",
  };
}

/** カルテの新規作成・編集ダイアログ（顧客詳細のカルテ履歴から使用） */
export function KarteFormDialog({
  mode,
  customerId,
  recordId,
  staffOptions,
  initial,
  trigger,
}: {
  mode: "create" | "edit";
  customerId: string;
  recordId?: string;
  staffOptions: StaffOption[];
  initial?: KarteFormValues;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<KarteFormValues>(initial ?? blankValues());
  const [saving, setSaving] = React.useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setForm(initial ?? blankValues());
  }

  function set<K extends keyof KarteFormValues>(key: K, value: KarteFormValues[K]) {
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

      const res =
        mode === "create"
          ? await fetch("/api/treatment-records", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...payload, customerId }),
            })
          : await fetch(`/api/treatment-records/${recordId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "保存に失敗しました");
        return;
      }
      toast.success(mode === "create" ? "カルテを作成しました" : "保存しました");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "カルテを作成" : "カルテを編集"}</DialogTitle>
          <DialogDescription>
            次回のご来店で活かせるように、施術の内容を記録します。
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="karte-visited-at">
                来店日 <span className="text-red-500" aria-hidden="true">*</span>
                <span className="sr-only">（必須）</span>
              </Label>
              <Input
                id="karte-visited-at"
                type="date"
                value={form.visitedAt}
                onChange={(e) => set("visitedAt", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="karte-service-name">メニュー名</Label>
              <Input
                id="karte-service-name"
                value={form.serviceName}
                onChange={(e) => set("serviceName", e.target.value)}
                placeholder="例: カット + カラー"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="karte-staff">担当スタッフ</Label>
            <Select
              value={form.staffId || STAFF_NONE}
              onValueChange={(v) => set("staffId", v === STAFF_NONE ? "" : v)}
            >
              <SelectTrigger id="karte-staff">
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
            <Label htmlFor="karte-content">
              施術内容 <span className="text-red-500" aria-hidden="true">*</span>
                <span className="sr-only">（必須）</span>
            </Label>
            <Textarea
              id="karte-content"
              rows={4}
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="例: 肩上10cmカット、前髪シースルー。毛量調整は表面のみ。"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="karte-materials">使用薬剤・カラー剤</Label>
            <Textarea
              id="karte-materials"
              rows={3}
              value={form.materials}
              onChange={(e) => set("materials", e.target.value)}
              placeholder="例: イルミナカラー オーシャン8 + クリア 1:1、オキシ6% 20分"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="karte-next-note">次回への申し送り</Label>
            <Textarea
              id="karte-next-note"
              rows={3}
              value={form.nextNote}
              onChange={(e) => set("nextNote", e.target.value)}
              placeholder="例: 次回は根元のみリタッチ。頭皮が敏感なため薬剤は地肌から離して塗布。"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>
                キャンセル
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? "保存中…" : mode === "create" ? "作成する" : "保存する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
