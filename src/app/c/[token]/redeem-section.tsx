"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** 公開ページ上でスタッフがクーポンを消込むための折りたたみセクション */
export function RedeemSection({ token }: { token: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handleRedeem() {
    setPending(true);
    try {
      const res = await fetch(`/api/public/coupons/${token}/redeem`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "処理に失敗しました");
        return;
      }
      toast.success("使用済みにしました");
      setConfirmOpen(false);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <details className="mt-6 rounded-lg border border-gray-200 bg-white">
        <summary className="cursor-pointer select-none rounded-lg px-4 py-3 text-center text-xs font-medium text-gray-400">
          スタッフの方はこちら
        </summary>
        <div className="border-t border-gray-100 px-4 py-4 text-center">
          <Button
            type="button"
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => setConfirmOpen(true)}
          >
            使用済みにする
          </Button>
        </div>
      </details>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>クーポンを使用済みにしますか</DialogTitle>
            <DialogDescription>
              店頭スタッフが操作してください。この操作は取り消せます（管理画面から）。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={pending}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={() => void handleRedeem()} disabled={pending}>
              {pending ? "処理中…" : "使用済みにする"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
