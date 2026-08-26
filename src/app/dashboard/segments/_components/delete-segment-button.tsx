"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** セグメント削除ボタン（確認ダイアログつき） */
export function DeleteSegmentButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function handleDelete() {
    const ok = window.confirm(
      `セグメント「${name}」を削除します。\nこのセグメントを配信対象にしている未送信のキャンペーンは対象の設定が解除され、全顧客が対象になります。\nお客様の情報は削除されません。`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/segments/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        toast.error(data.error ?? "削除に失敗しました");
        return;
      }
      toast.success("削除しました");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-11 text-red-600 hover:bg-red-50 hover:text-red-700"
      onClick={handleDelete}
      disabled={busy}
      aria-label={`セグメント「${name}」を削除`}
    >
      <Trash2 aria-hidden="true" />
      {busy ? "削除中…" : "削除"}
    </Button>
  );
}
