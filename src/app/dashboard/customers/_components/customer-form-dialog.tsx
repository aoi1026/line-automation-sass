"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GENDER_LABELS } from "@/lib/constants";
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

export type CustomerFormInitial = {
  name: string;
  kana: string;
  phone: string;
  email: string;
  gender: string;
  /** "YYYY-MM-DD" または "" */
  birthday: string;
  notes: string;
};

const GENDER_NONE = "none";
const BLANK: CustomerFormInitial = {
  name: "",
  kana: "",
  phone: "",
  email: "",
  gender: "",
  birthday: "",
  notes: "",
};

/** 顧客の登録・編集ダイアログ */
export function CustomerFormDialog({
  mode,
  trigger,
  customerId,
  initial,
}: {
  mode: "create" | "edit";
  trigger: React.ReactNode;
  customerId?: string;
  initial?: CustomerFormInitial;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<CustomerFormInitial>(initial ?? BLANK);
  const [saving, setSaving] = React.useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setForm(initial ?? BLANK);
  }

  function set<K extends keyof CustomerFormInitial>(key: K, value: CustomerFormInitial[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("氏名を入力してください");
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        kana: form.kana.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        gender: form.gender,
        birthday: form.birthday || null,
        notes: form.notes,
      };

      if (mode === "create") {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
        if (!res.ok || !data.id) {
          toast.error(data.error ?? "登録に失敗しました");
          return;
        }
        toast.success("登録しました");
        setOpen(false);
        router.push(`/dashboard/customers/${data.id}`);
        router.refresh();
        return;
      }

      if (!customerId) return;
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "保存に失敗しました");
        return;
      }
      toast.success("保存しました");
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
          <DialogTitle>{mode === "create" ? "顧客を登録" : "顧客情報を編集"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "お客様の基本情報を入力して登録します。"
              : "お客様の基本情報を編集します。"}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer-name">
                氏名 <span className="text-red-500" aria-hidden="true">*</span>
                <span className="sr-only">（必須）</span>
              </Label>
              <Input
                id="customer-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="例: 山田 花子"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-kana">かな</Label>
              <Input
                id="customer-kana"
                value={form.kana}
                onChange={(e) => set("kana", e.target.value)}
                placeholder="例: やまだ はなこ"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-phone">電話番号</Label>
              <Input
                id="customer-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="例: 090-1234-5678"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-email">メールアドレス</Label>
              <Input
                id="customer-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="例: hanako@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>性別</Label>
              <Select
                value={form.gender || GENDER_NONE}
                onValueChange={(v) => set("gender", v === GENDER_NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GENDER_NONE}>{GENDER_LABELS[""]}</SelectItem>
                  <SelectItem value="female">{GENDER_LABELS.female}</SelectItem>
                  <SelectItem value="male">{GENDER_LABELS.male}</SelectItem>
                  <SelectItem value="other">{GENDER_LABELS.other}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customer-birthday">誕生日</Label>
              <Input
                id="customer-birthday"
                type="date"
                value={form.birthday}
                onChange={(e) => set("birthday", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customer-notes">メモ</Label>
            <Textarea
              id="customer-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="施術の好みやアレルギーなど、お客様に関するメモ"
            />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>
                キャンセル
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>
              {saving ? "保存中…" : mode === "create" ? "登録する" : "保存する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
