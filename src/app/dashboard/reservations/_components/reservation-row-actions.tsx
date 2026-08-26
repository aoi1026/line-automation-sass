"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  CheckCircle2,
  FileText,
  MoreHorizontal,
  RotateCcw,
  Trash2,
  UserX,
  XCircle,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ReservationRow } from "./types";

export function ReservationRowActions({ row }: { row: ReservationRow }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");

  const [rescheduleOpen, setRescheduleOpen] = React.useState(false);
  const [newDate, setNewDate] = React.useState(row.ymd);
  const [newTime, setNewTime] = React.useState(row.startTime);

  const [deleteOpen, setDeleteOpen] = React.useState(false);

  async function patchAction(
    body: Record<string, unknown>,
    successMessage: string
  ): Promise<boolean> {
    setBusy(true);
    try {
      const res = await fetch(`/api/reservations/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(json.error ?? "操作に失敗しました");
        return false;
      }
      toast.success(successMessage);
      router.refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      const res = await fetch(`/api/reservations/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(json.error ?? "削除に失敗しました");
        return;
      }
      toast.success("予約を削除しました");
      setDeleteOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const isActive = row.status === "PENDING" || row.status === "CONFIRMED";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 md:h-8 md:w-8"
            aria-label={`${row.customerName}様の予約の操作メニュー`}
            disabled={busy}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => router.push(`/dashboard/reservations/${row.id}`)}
          >
            <FileText aria-hidden="true" />
            詳細を見る
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {row.status === "PENDING" && (
            <DropdownMenuItem
              onSelect={() => void patchAction({ action: "confirm" }, "予約を確定しました")}
            >
              <CheckCircle2 aria-hidden="true" />
              確定する
            </DropdownMenuItem>
          )}
          {isActive && (
            <>
              <DropdownMenuItem
                onSelect={() => void patchAction({ action: "complete" }, "来店済みにしました")}
              >
                <CheckCircle2 aria-hidden="true" />
                来店済みにする
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setNewDate(row.ymd);
                  setNewTime(row.startTime);
                  setRescheduleOpen(true);
                }}
              >
                <CalendarClock aria-hidden="true" />
                日時を変更
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onSelect={() => {
                  setCancelReason("");
                  setCancelOpen(true);
                }}
              >
                <XCircle aria-hidden="true" />
                キャンセル
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onSelect={() =>
                  void patchAction({ action: "no_show" }, "無断キャンセルとして記録しました")
                }
              >
                <UserX aria-hidden="true" />
                無断キャンセル
              </DropdownMenuItem>
            </>
          )}
          {row.status === "COMPLETED" && (
            <DropdownMenuItem
              onSelect={() => void patchAction({ action: "uncomplete" }, "来店済みを取り消しました")}
            >
              <RotateCcw aria-hidden="true" />
              来店済みを取り消す
            </DropdownMenuItem>
          )}
          {(row.status === "CANCELLED" || row.status === "NO_SHOW") && (
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onSelect={() => setDeleteOpen(true)}
            >
              <Trash2 aria-hidden="true" />
              削除する
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* キャンセルダイアログ */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約のキャンセル</DialogTitle>
            <DialogDescription>
              {row.customerName}様の予約をキャンセルします。お客様がLINE連携済みの場合はキャンセル通知が送信されます。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`cancel-reason-${row.id}`}>キャンセル理由（任意）</Label>
            <Textarea
              id={`cancel-reason-${row.id}`}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="例: お客様都合により変更のご連絡がありました"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={busy}>
              閉じる
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                const ok = await patchAction(
                  { action: "cancel", cancelReason: cancelReason.trim() },
                  "予約をキャンセルしました"
                );
                if (ok) setCancelOpen(false);
              }}
            >
              {busy ? "キャンセル中…" : "キャンセルを確定"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 日時変更ダイアログ */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>日時の変更</DialogTitle>
            <DialogDescription>
              {row.customerName}様の予約を新しい日時に変更します。お客様がLINE連携済みの場合は変更通知が送信されます。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`reschedule-date-${row.id}`}>新しい日付</Label>
              <Input
                id={`reschedule-date-${row.id}`}
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`reschedule-time-${row.id}`}>新しい時刻</Label>
              <Input
                id={`reschedule-time-${row.id}`}
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)} disabled={busy}>
              閉じる
            </Button>
            <Button
              disabled={busy || !newDate || !newTime}
              onClick={async () => {
                const ok = await patchAction(
                  { action: "reschedule", date: newDate, time: newTime },
                  "予約日時を変更しました"
                );
                if (ok) setRescheduleOpen(false);
              }}
            >
              {busy ? "保存中…" : "変更を保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>予約の削除</DialogTitle>
            <DialogDescription>
              {row.customerName}様の予約を削除します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={busy}>
              閉じる
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void handleDelete()}>
              <Trash2 aria-hidden="true" />
              {busy ? "削除中…" : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
