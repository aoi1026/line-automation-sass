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
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const openAdd = () => {
    setEditing(null);
    setNameError(null);
    setForm(emptyForm(services.length));
    setDialogOpen(true);
  };

  const openEdit = (service: ServiceRow) => {
    setEditing(service);
    setNameError(null);
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
      setNameError("メニュー名を入力してください");
      toast.error("メニュー名を入力してください");
      return;
    }
    setNameError(null);
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
    const ok = window.confirm(
      `「${service.name}」を削除します。\nWeb予約ページのメニュー一覧から表示されなくなり、お客様は選べなくなります。\n過去の予約履歴と売上はそのまま残ります。`
    );
    if (!ok) return;
    setDeletingId(service.id);
    try {
      const res = await fetch(`/api/services/${service.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("メニューを削除しました");
        router.refresh();
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "削除に失敗しました");
      }
    } finally {
      setDeletingId(null);
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
            <Plus aria-hidden="true" />
            メニューを追加
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <EmptyState
            icon={<Scissors aria-hidden="true" />}
            title="メニューが未登録"
            description="カットやカラーなどのメニューを登録すると、Web予約でお客様が選択できるようになります。まずは主力メニューを1つ登録してみましょう。"
            action={
              <Button onClick={openAdd}>
                <Plus aria-hidden="true" />
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
                      aria-label={`${service.name}をWeb予約ページに表示する`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-11"
                        onClick={() => openEdit(service)}
                        aria-label={`${service.name}を編集`}
                      >
                        <Pencil aria-hidden="true" />
                        編集
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-11 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => remove(service)}
                        disabled={deletingId === service.id}
                        aria-label={`${service.name}を削除`}
                      >
                        <Trash2 aria-hidden="true" />
                        {deletingId === service.id ? "削除中…" : "削除"}
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
              <Label htmlFor="service-name">
                メニュー名
                <span className="ml-0.5 text-red-500" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="service-name"
                value={form.name}
                onChange={(e) => {
                  set({ name: e.target.value });
                  if (nameError) setNameError(null);
                }}
                placeholder="例: カット + カラー"
                required
                aria-required="true"
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "service-name-error" : undefined}
              />
              {nameError && (
                <p id="service-name-error" role="alert" className="mt-1 text-xs text-red-600">
                  {nameError}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service-category">カテゴリ</Label>
              <Input
                id="service-category"
                value={form.category}
                onChange={(e) => set({ category: e.target.value })}
                placeholder="例: カラー"
                aria-describedby="service-category-help"
              />
              <p id="service-category-help" className="mt-1 text-xs text-gray-500">
                Web予約ページでメニューをグループごとにまとめて表示します。
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="service-description">説明</Label>
              <Textarea
                id="service-description"
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                rows={3}
                placeholder="メニューの内容やおすすめポイントをご記入ください。"
                aria-describedby="service-description-help"
              />
              <p id="service-description-help" className="mt-1 text-xs text-gray-500">
                Web予約ページでメニュー名の下に表示されます。
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service-duration">所要時間</Label>
                <Select value={form.durationMin} onValueChange={(v) => set({ durationMin: v })}>
                  <SelectTrigger id="service-duration" aria-describedby="service-duration-help">
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
                <p id="service-duration-help" className="mt-1 text-xs text-gray-500">
                  この時間だけ予約枠を確保します。
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service-price">料金（円）</Label>
                <Input
                  id="service-price"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.price}
                  onChange={(e) => set({ price: e.target.value })}
                  placeholder="例: 8800"
                  aria-describedby="service-price-help"
                />
                <p id="service-price-help" className="mt-1 text-xs text-gray-500">
                  税込価格を半角数字でご入力ください。
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service-repeat">推奨再来店間隔（日）</Label>
                <Input
                  id="service-repeat"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={365}
                  value={form.repeatIntervalDays}
                  onChange={(e) => set({ repeatIntervalDays: e.target.value })}
                  placeholder="未設定なら店舗標準"
                  aria-describedby="service-repeat-help"
                />
                <p id="service-repeat-help" className="mt-1 text-xs text-gray-500">
                  再来店リマインドを送るまでの日数です。
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service-sort">表示順</Label>
                <Input
                  id="service-sort"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => set({ sortOrder: e.target.value })}
                  aria-describedby="service-sort-help"
                />
                <p id="service-sort-help" className="mt-1 text-xs text-gray-500">
                  数字が小さいほど上に表示されます。
                </p>
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
