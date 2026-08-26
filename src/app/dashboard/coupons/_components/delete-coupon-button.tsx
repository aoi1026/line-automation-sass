"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteCouponButton({
  couponId,
  couponTitle,
  iconOnly = false,
}: {
  couponId: string;
  couponTitle: string;
  /** テーブル行内などで使うアイコンのみの表示 */
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/coupons/${couponId}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "削除に失敗しました");
        return;
      }
      toast.success("削除しました");
      setOpen(false);
      router.push("/dashboard/coupons");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {iconOnly ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`クーポン「${couponTitle}」を削除`}
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="text-red-600 hover:bg-red-50"
          >
            <Trash2 aria-hidden="true" />
            削除
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>クーポンを削除</DialogTitle>
          <DialogDescription>
            「{couponTitle}
            」を削除します。発行済みのクーポンはお客様の画面で表示されなくなり、店頭でのご利用もできなくなります。発行・利用の履歴も削除されます。この操作は取り消せません。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={deleting}
          >
            キャンセル
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "削除中…" : "削除する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
