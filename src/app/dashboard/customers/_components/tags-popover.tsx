"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type TagOption = { id: string; name: string; color: string };

/** 顧客タグの編集ポップオーバー（チェックボックス一覧） */
export function TagsPopover({
  customerId,
  storeTags,
  selectedTagIds,
}: {
  customerId: string;
  storeTags: TagOption[];
  selectedTagIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>(selectedTagIds);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setSelected(selectedTagIds);
  }, [open, selectedTagIds]);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((t) => t !== id)));
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tagIds: selected }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "タグの保存に失敗しました");
        return;
      }
      toast.success("タグを保存しました");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="このお客様のタグを編集"
          className="h-7 gap-1 px-1.5 text-xs text-gray-400 hover:text-gray-600"
        >
          <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
          編集
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <p className="mb-2 text-sm font-medium text-gray-900">タグを編集</p>
        {storeTags.length === 0 ? (
          <p className="text-sm text-gray-500">タグがまだありません。ツールバーの「タグを管理」から追加できます。</p>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {storeTags.map((tag) => (
              <label
                key={tag.id}
                className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
              >
                <Checkbox
                  checked={selected.includes(tag.id)}
                  onCheckedChange={(c) => toggle(tag.id, c === true)}
                />
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
