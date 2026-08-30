"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ReservationStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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

/** 実行中のボタンだけラベルを差し替えるための識別子 */
type ActionKey =
  | "confirm"
  | "complete"
  | "pending"
  | "cancel"
  | "no_show"
  | "uncomplete"
  | "restore";

export function StatusActions({ id, status }: { id: string; status: ReservationStatus }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<ActionKey | null>(null);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [noShowOpen, setNoShowOpen] = React.useState(false);
  const [restoreOpen, setRestoreOpen] = React.useState(false);

  const submitting = pending !== null;

  async function changeStatus(
    key: ActionKey,
    next: ReservationStatus,
    message: string,
    reason?: string
  ): Promise<boolean> {
    setPending(key);
    try {
      // 操作キーをそのままAPIのアクションに対応させる。
      // 確定を取り消す操作だけ「未確定に戻す」= unconfirm という名前にしている。
      const action = key === "pending" ? "unconfirm" : key;
      const body: Record<string, unknown> = { action };
      if (reason !== undefined) body.cancelReason = reason;
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
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
      setPending(null);
    }
  }

  /**
   * キャンセル・無断キャンセルの予約を確定に戻す。
   * 空き枠の確認とお客様への予約確認通知を行うため、
   * 汎用のステータス変更ではなく専用の復元APIを使う。
   */
  async function restoreReservation(): Promise<void> {
    setPending("restore");
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        notified?: boolean;
      };
      if (!res.ok) {
        toast.error(data.error ?? "予約の復元に失敗しました");
        return;
      }
      toast.success(
        data.notified
          ? "予約を復元し、お客様に予約確認を送信しました"
          : "予約を復元しました"
      );
      setRestoreOpen(false);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  /** 実行中は「処理中…」に切り替える */
  function label(key: ActionKey, text: string) {
    return pending === key ? "処理中…" : text;
  }

  return (
    <div className="flex flex-wrap gap-2" aria-busy={submitting}>
      {status === "PENDING" && (
        <Button
          disabled={submitting}
          onClick={() => changeStatus("confirm", "CONFIRMED", "予約を確定しました")}
        >
          {label("confirm", "確定する")}
        </Button>
      )}
      {(status === "PENDING" || status === "CONFIRMED") && (
        <Button
          variant={status === "CONFIRMED" ? "default" : "outline"}
          disabled={submitting}
          onClick={() => changeStatus("complete", "COMPLETED", "来店済みにしました")}
        >
          {label("complete", "来店済みにする")}
        </Button>
      )}
      {status === "CONFIRMED" && (
        <Button
          variant="outline"
          disabled={submitting}
          onClick={() => changeStatus("pending", "PENDING", "未確定に戻しました")}
        >
          {label("pending", "未確定に戻す")}
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
            onClick={() => setNoShowOpen(true)}
          >
            {label("no_show", "無断キャンセルにする")}
          </Button>
        </>
      )}
      {status === "COMPLETED" && (
        <Button
          variant="outline"
          disabled={submitting}
          onClick={() => changeStatus("uncomplete", "CONFIRMED", "来店済みを取り消しました")}
        >
          {label("uncomplete", "来店済みを取り消す")}
        </Button>
      )}
      {(status === "CANCELLED" || status === "NO_SHOW") && (
        <Button
          variant="outline"
          disabled={submitting}
          onClick={() => setRestoreOpen(true)}
        >
          {label("restore", "予約を復元する")}
        </Button>
      )}

      <ConfirmDialog
        open={noShowOpen}
        onOpenChange={setNoShowOpen}
        title="無断キャンセルとして記録"
        description="この予約を無断キャンセルとして記録します。お客様の来店履歴に残り、来店実績には計上されません。お客様へメッセージは送信されません。"
        confirmLabel="無断キャンセルにする"
        destructive
        loading={pending === "no_show"}
        onConfirm={async () => {
          const ok = await changeStatus(
            "no_show",
            "NO_SHOW",
            "無断キャンセルとして記録しました"
          );
          if (ok) setNoShowOpen(false);
        }}
      />

      <ConfirmDialog
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
        title="予約を復元"
        description="この予約を「確定」に戻します。元の日時にすでに別の予約が入っている場合は復元できません。これから先の予約で予約確認の自動配信が有効な場合は、お客様のLINEへ予約確認のメッセージが送信されます。"
        confirmLabel="復元する"
        loading={pending === "restore"}
        onConfirm={restoreReservation}
      />

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約のキャンセル</DialogTitle>
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
                  "cancel",
                  "CANCELLED",
                  "予約をキャンセルしました",
                  cancelReason
                );
                if (ok) setCancelOpen(false);
              }}
            >
              {label("cancel", "キャンセルを確定")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
