"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Scissors, Trash2 } from "lucide-react";
import { formatYen } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { ServiceRow } from "./settings-tabs";

const DURATION_OPTIONS = [30, 45, 60, 90, 120];

type FormState = {
  name: string;
  category: string;
  description: string;
  durationMin: string;
  price: string;
  repeatIntervalDays: string;
  sortOrder: string;
};

const emptyForm = (sortOrder: number): FormState => ({
  name: "",
  category: "",
  description: "",
  durationMin: "60",
  price: "",
  repeatIntervalDays: "",
  sortOrder: String(sortOrder),
});

export function ServicesTab({ services }: { services: ServiceRow[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm(0));
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm(services.length));
    setDialogOpen(true);
  };

  const openEdit = (service: ServiceRow) => {
    setEditing(service);
    setForm({
      name: service.name,
      category: service.category,
      description: service.description,
      durationMin: String(service.durationMin),
      price: String(service.price),
      repeatIntervalDays: service.repeatIntervalDays == null ? "" : String(service.repeatIntervalDays),
      sortOrder: String(service.sortOrder),
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("メニュー名を入力してください");
      return;
    }
    const price = form.price.trim() === "" ? 0 : Number(form.price);
    if (!Number.isInteger(price) || price < 0) {
      toast.error("料金は0円以上の整数で入力してください");
      return;
    }
    let repeatIntervalDays: number | null = null;
    if (form.repeatIntervalDays.trim() !== "") {
      const days = Number(form.repeatIntervalDays);
      if (!Number.isInteger(days) || days < 1 || days > 365) {
        toast.error("推奨再来店間隔は1〜365日で入力してください");
        return;
      }
      repeatIntervalDays = days;
    }
    const sortOrder = form.sortOrder.trim() === "" ? 0 : Number(form.sortOrder);
    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      toast.error("表示順は0以上の整数で入力してください");
      return;
    }

    setSaving(true);
    try {
      const body = JSON.stringify({
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description,
        durationMin: Number(form.durationMin),
        price,
        repeatIntervalDays,
        sortOrder,
      });
      const res = editing
        ? await fetch(`/api/services/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body,
          })
        : await fetch("/api/services", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
      if (res.ok) {
        toast.success(editing ? "メニューを更新しました" : "メニューを追加しました");
        setDialogOpen(false);
        router.refresh();
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (service: ServiceRow, active: boolean) => {
    const res = await fetch(`/api/services/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (res.ok) {
      toast.success(active ? "メニューを有効にしました" : "メニューを無効にしました");
      router.refresh();
    } else {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ?? "更新に失敗しました");
    }
  };

  const remove = async (service: ServiceRow) => {
    if (!window.confirm(`「${service.name}」を削除します。よろしいですか？\n過去の予約履歴はそのまま残ります。`)) {
      return;
    }
    const res = await fetch(`/api/services/${service.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("メニューを削除しました");
      router.refresh();
    } else {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ?? "削除に失敗しました");
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1.5">
            <CardTitle>メニュー管理</CardTitle>
            <CardDescription>
              Web予約や再来店リマインドで使用されるメニューです。無効にすると予約ページに表示されません。
            </CardDescription>
          </div>
          <Button onClick={openAdd} className="shrink-0">
            <Plus />
            メニューを追加
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <EmptyState
            icon={<Scissors />}
            title="メニューが未登録"
            description="カットやカラーなどのメニューを登録すると、Web予約で選択できるようになります。"
            action={
              <Button onClick={openAdd}>
                <Plus />
                メニューを追加
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>メニュー名</TableHead>
                <TableHead>所要時間</TableHead>
                <TableHead>料金</TableHead>
                <TableHead>再来店間隔</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{service.name}</div>
                    {service.category && (
                      <div className="mt-0.5 text-xs text-gray-500">{service.category}</div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-gray-700">
                    {service.durationMin}分
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-gray-700">
                    {formatYen(service.price)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {service.repeatIntervalDays != null ? (
                      <span className="text-gray-700">{service.repeatIntervalDays}日</span>
                    ) : (
                      <span className="text-gray-400">標準</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={service.active}
                      onCheckedChange={(checked) => toggleActive(service, checked)}
                      aria-label={`${service.name}の有効・無効`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(service)}>
                        <Pencil />
                        編集
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => remove(service)}
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
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "メニューを編集" : "メニューを追加"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "メニューの内容を変更できます。"
                : "Web予約で選択できるメニューを登録します。"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service-name">メニュー名</Label>
              <Input
                id="service-name"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="例: カット + カラー"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service-category">カテゴリ</Label>
              <Input
                id="service-category"
                value={form.category}
                onChange={(e) => set({ category: e.target.value })}
                placeholder="例: カラー"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service-description">説明</Label>
              <Textarea
                id="service-description"
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                rows={3}
                placeholder="メニューの内容やおすすめポイントをご記入ください。"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>所要時間</Label>
                <Select value={form.durationMin} onValueChange={(v) => set({ durationMin: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((v) => (
                      <SelectItem key={v} value={String(v)}>
                        {v}分
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service-price">料金（円）</Label>
                <Input
                  id="service-price"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => set({ price: e.target.value })}
                  placeholder="例: 8800"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service-repeat">推奨再来店間隔（日）</Label>
                <Input
                  id="service-repeat"
                  type="number"
                  min={1}
                  max={365}
                  value={form.repeatIntervalDays}
                  onChange={(e) => set({ repeatIntervalDays: e.target.value })}
                  placeholder="未設定なら店舗標準"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service-sort">表示順</Label>
                <Input
                  id="service-sort"
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => set({ sortOrder: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              キャンセル
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "保存中…" : editing ? "更新" : "追加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
