"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Tags, Trash2 } from "lucide-react";
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

export type TagOption = { id: string; name: string; color: string };

const DEFAULT_COLOR = "#06C755";

/** 店舗タグの管理ダイアログ（作成・削除） */
export function TagManageDialog({ tags }: { tags: TagOption[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [list, setList] = React.useState<TagOption[]>(tags);
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(DEFAULT_COLOR);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) setList(tags);
  }, [open, tags]);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, color }),
      });
      const data = (await res.json().catch(() => ({}))) as TagOption & { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "タグを追加できませんでした");
        return;
      }
      setList((prev) => [...prev, data]);
      setName("");
      setColor(DEFAULT_COLOR);
      toast.success("タグを追加しました");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tag: TagOption) {
    if (!window.confirm(`タグ「${tag.name}」を削除します。よろしいですか？`)) return;
    setDeletingId(tag.id);
    try {
      const res = await fetch(`/api/tags/${tag.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "削除に失敗しました");
        return;
      }
      setList((prev) => prev.filter((t) => t.id !== tag.id));
      toast.success("削除しました");
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Tags />
          タグを管理
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>タグを管理</DialogTitle>
          <DialogDescription>顧客に付けるタグを作成・削除します。</DialogDescription>
        </DialogHeader>

        {list.length > 0 ? (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {list.map((tag) => (
              <li key={tag.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => void handleDelete(tag)}
                  disabled={deletingId === tag.id}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">タグがまだありません。</p>
        )}

        <div className="flex items-end gap-2 border-t border-gray-100 pt-4">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="tag-name">新しいタグ名</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: VIP"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAdd();
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tag-color">色</Label>
            <input
              id="tag-color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-lg border border-gray-300 p-1"
            />
          </div>
          <Button type="button" onClick={() => void handleAdd()} disabled={saving || !name.trim()}>
            <Plus />
            追加
          </Button>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              閉じる
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
