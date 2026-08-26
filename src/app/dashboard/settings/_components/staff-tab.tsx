"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StaffRow } from "./settings-tabs";

type FormState = {
  name: string;
  title: string;
  sortOrder: string;
};

export function StaffTab({ staffMembers }: { staffMembers: StaffRow[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [form, setForm] = useState<FormState>({ name: "", title: "", sortOrder: "0" });
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", title: "", sortOrder: String(staffMembers.length) });
    setDialogOpen(true);
  };

  const openEdit = (staff: StaffRow) => {
    setEditing(staff);
    setForm({ name: staff.name, title: staff.title, sortOrder: String(staff.sortOrder) });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("名前を入力してください");
      return;
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
        title: form.title.trim(),
        sortOrder,
      });
      const res = editing
        ? await fetch(`/api/staff/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body,
          })
        : await fetch("/api/staff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
          });
      if (res.ok) {
        toast.success(editing ? "スタッフ情報を更新しました" : "スタッフを追加しました");
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

  const toggleActive = async (staff: StaffRow, active: boolean) => {
    const res = await fetch(`/api/staff/${staff.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (res.ok) {
      toast.success(active ? "スタッフを有効にしました" : "スタッフを無効にしました");
      router.refresh();
    } else {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(data?.error ?? "更新に失敗しました");
    }
  };

  const remove = async (staff: StaffRow) => {
    if (!window.confirm(`「${staff.name}」を削除します。よろしいですか？\n過去の予約履歴はそのまま残ります。`)) {
      return;
    }
    const res = await fetch(`/api/staff/${staff.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("スタッフを削除しました");
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
            <CardTitle>スタッフ管理</CardTitle>
            <CardDescription>
              予約の担当者として選択できるスタッフです。無効にすると予約ページに表示されません。
            </CardDescription>
          </div>
          <Button onClick={openAdd} className="shrink-0">
            <Plus />
            スタッフを追加
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {staffMembers.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title="スタッフが未登録"
            description="スタッフを登録すると、予約時に担当者を指定できるようになります。"
            action={
              <Button onClick={openAdd}>
                <Plus />
                スタッフを追加
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>役職</TableHead>
                <TableHead>状態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffMembers.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell className="font-medium text-gray-900">{staff.name}</TableCell>
                  <TableCell className="text-gray-700">
                    {staff.title || <span className="text-gray-400">未設定</span>}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={staff.active}
                      onCheckedChange={(checked) => toggleActive(staff, checked)}
                      aria-label={`${staff.name}の有効・無効`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(staff)}>
                        <Pencil />
                        編集
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => remove(staff)}
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
            <DialogTitle>{editing ? "スタッフを編集" : "スタッフを追加"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "スタッフの情報を変更できます。"
                : "予約の担当者として選択できるスタッフを登録します。"}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff-name">名前</Label>
              <Input
                id="staff-name"
                value={form.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="例: 山田 花子"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="staff-title">役職</Label>
                <Input
                  id="staff-title"
                  value={form.title}
                  onChange={(e) => set({ title: e.target.value })}
                  placeholder="スタイリスト"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="staff-sort">表示順</Label>
                <Input
                  id="staff-sort"
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
