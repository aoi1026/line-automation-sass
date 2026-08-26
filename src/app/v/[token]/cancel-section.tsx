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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";

const REASON_MAX = 500;

export function CancelSection({ token }: { token: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const cancel = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/public/reservations/${token}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelReason: reason.trim() }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "キャンセルの処理に失敗しました。もう一度お試しください");
        return;
      }
      toast.success("ご予約をキャンセルしました");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("キャンセルの処理に失敗しました。通信環境をご確認ください");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-400/50"
        onClick={() => setOpen(true)}
      >
        予約をキャンセル
      </Button>
      <p className="mt-2 text-center text-xs leading-relaxed text-gray-500">
        タップすると確認画面が開きます。この時点ではまだキャンセルされません。
      </p>

      <Dialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約のキャンセル</DialogTitle>
            <DialogDescription>
              このご予約をキャンセルします。キャンセル後に元へ戻すことはできませんので、ご了承ください。
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cancel-reason">キャンセル理由（任意）</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ご都合など、差し支えなければお聞かせください"
              rows={3}
              maxLength={REASON_MAX}
              disabled={loading}
              aria-describedby="cancel-reason-hint"
            />
            <p id="cancel-reason-hint" className="text-xs text-gray-500">
              {REASON_MAX}文字以内。未入力のままでもキャンセルいただけます。
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              閉じる
            </Button>
            <Button
              variant="destructive"
              className="min-h-[44px]"
              onClick={() => void cancel()}
              disabled={loading}
            >
              {loading && <Spinner className="h-4 w-4 text-white" />}
              {loading ? "処理しています…" : "予約をキャンセルする"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
