"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";

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
      <details className="group mt-6 rounded-lg border border-gray-200 bg-white">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-center gap-1 rounded-lg px-4 py-3 text-center text-xs font-medium text-gray-400 transition-colors hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 [&::-webkit-details-marker]:hidden">
          スタッフの方はこちら
          <ChevronDown
            aria-hidden="true"
            className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
          />
        </summary>
        <div className="border-t border-gray-100 px-4 py-4 text-center">
          <p className="text-xs leading-relaxed text-gray-500">
            お客様のご来店時に、店頭スタッフが消し込み（使用済みへの変更）を行ってください。
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-11 w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-400/50"
            onClick={() => setConfirmOpen(true)}
          >
            使用済みにする
          </Button>
        </div>
      </details>

      <Dialog open={confirmOpen} onOpenChange={(v) => !pending && setConfirmOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>クーポンを使用済みにしますか</DialogTitle>
            <DialogDescription>
              店頭スタッフが操作してください。取り消しは管理画面から行えます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              閉じる
            </Button>
            <Button
              variant="destructive"
              className="min-h-[44px]"
              onClick={() => void handleRedeem()}
              disabled={pending}
            >
              {pending && <Spinner className="h-4 w-4 text-white" />}
              {pending ? "処理しています…" : "使用済みにする"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
