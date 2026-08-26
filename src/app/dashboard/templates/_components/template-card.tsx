"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { MessageKind } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { TemplateFormDialog } from "./template-form-dialog";

export type TemplateItem = {
  id: string;
  kind: MessageKind;
  name: string;
  content: string;
  enabled: boolean;
  usedByAutomation: boolean;
  updatedLabel: string;
};

/** テンプレート1件のカード（有効切替・編集・削除） */
export function TemplateCard({
  template,
  storeName,
}: {
  template: TemplateItem;
  storeName: string;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [duplicating, setDuplicating] = React.useState(false);

  async function handleToggle(enabled: boolean) {
    setToggling(true);
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "保存に失敗しました");
        return;
      }
      toast.success(enabled ? "有効にしました" : "無効にしました");
      router.refresh();
    } finally {
      setToggling(false);
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: template.kind,
          name: `${template.name}のコピー`,
          content: template.content,
          enabled: template.enabled,
        }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "複製に失敗しました");
        return;
      }
      toast.success("複製しました");
      router.refresh();
    } finally {
      setDuplicating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/templates/${template.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "削除に失敗しました");
        return;
      }
      toast.success("削除しました");
      setDeleteOpen(false);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{template.name}</p>
            {template.usedByAutomation && (
              <Badge className="mt-1.5">自動配信で使用中</Badge>
            )}
          </div>
          <Switch
            checked={template.enabled}
            disabled={toggling}
            onCheckedChange={handleToggle}
            aria-label={`テンプレート「${template.name}」を有効にする`}
          />
        </div>

        <p className="line-clamp-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-500">
          {template.content}
        </p>

        <p className="text-xs text-gray-400">
          {template.enabled ? "自動配信で選択できます" : "無効のため自動配信では選択できません"}
        </p>

        <p className="text-xs text-gray-400">更新日: {template.updatedLabel}</p>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-11"
            onClick={() => setEditOpen(true)}
            aria-label={`テンプレート「${template.name}」を編集`}
          >
            <Pencil aria-hidden="true" />
            編集
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-11"
            onClick={handleDuplicate}
            disabled={duplicating}
            aria-label={`テンプレート「${template.name}」を複製`}
          >
            <Copy aria-hidden="true" />
            {duplicating ? "複製中…" : "複製"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-11 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setDeleteOpen(true)}
            aria-label={`テンプレート「${template.name}」を削除`}
          >
            <Trash2 aria-hidden="true" />
            削除
          </Button>
        </div>
      </CardContent>

      <TemplateFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        storeName={storeName}
        initial={{
          id: template.id,
          kind: template.kind,
          name: template.name,
          content: template.content,
        }}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>テンプレートを削除</DialogTitle>
            <DialogDescription>
              「{template.name}」を削除します。
              {template.usedByAutomation
                ? "この文面を使用している自動配信は、以後リピナビの標準文面で送信されます。"
                : "作成した文面は元に戻せません。"}
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "削除中…" : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
