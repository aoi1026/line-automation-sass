"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ReservationStatus } from "@prisma/client";
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

export function StatusActions({ id, status }: { id: string; status: ReservationStatus }) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");

  async function changeStatus(
    next: ReservationStatus,
    message: string,
    reason?: string
  ): Promise<boolean> {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { status: next };
      if (reason !== undefined) body.cancelReason = reason;
      const res = await fetch(`/api/reservations/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "ステータスの変更に失敗しました");
        return false;
      }
      toast.success(message);
      router.refresh();
      return true;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status === "PENDING" && (
        <Button
          disabled={submitting}
          onClick={() => changeStatus("CONFIRMED", "予約を確定しました")}
        >
          確定する
        </Button>
      )}
      {(status === "PENDING" || status === "CONFIRMED") && (
        <Button
          variant={status === "CONFIRMED" ? "default" : "outline"}
          disabled={submitting}
          onClick={() => changeStatus("COMPLETED", "来店済みにしました")}
        >
          来店済みにする
        </Button>
      )}
      {status === "CONFIRMED" && (
        <Button
          variant="outline"
          disabled={submitting}
          onClick={() => changeStatus("PENDING", "未確定に戻しました")}
        >
          未確定に戻す
        </Button>
      )}
      {(status === "PENDING" || status === "CONFIRMED") && (
        <>
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
            disabled={submitting}
            onClick={() => setCancelOpen(true)}
          >
            キャンセルする
          </Button>
          <Button
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50"
            disabled={submitting}
            onClick={() => changeStatus("NO_SHOW", "無断キャンセルとして記録しました")}
          >
            無断キャンセルにする
          </Button>
        </>
      )}
      {status === "COMPLETED" && (
        <Button
          variant="outline"
          disabled={submitting}
          onClick={() => changeStatus("CONFIRMED", "来店済みを取り消しました")}
        >
          来店済みを取り消す
        </Button>
      )}
      {(status === "CANCELLED" || status === "NO_SHOW") && (
        <Button
          variant="outline"
          disabled={submitting}
          onClick={() => changeStatus("CONFIRMED", "予約を復元しました")}
        >
          予約を復元する
        </Button>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約をキャンセル</DialogTitle>
            <DialogDescription>
              この予約をキャンセルします。キャンセル通知の自動配信が有効な場合、お客様に通知が送信されます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">キャンセル理由（任意）</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="例: お客様のご都合によるキャンセル"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => setCancelOpen(false)}
            >
              閉じる
            </Button>
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={async () => {
                const ok = await changeStatus(
                  "CANCELLED",
                  "予約をキャンセルしました",
                  cancelReason
                );
                if (ok) setCancelOpen(false);
              }}
            >
              キャンセルする
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
