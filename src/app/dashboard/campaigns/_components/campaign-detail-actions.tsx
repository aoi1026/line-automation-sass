"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Pencil, Send, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { CampaignStatus } from "@prisma/client";
import { addHours } from "@/lib/jst";
import { formatNumber } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isoToJstInput, jstInputToIso, nowJstInput } from "./jst-datetime";

/**
 * ステータスに応じたキャンペーン操作ボタン。
 * DRAFT: 編集 / 配信予約 / 今すぐ配信 / 削除
 * SCHEDULED: 今すぐ配信 / 中止
 * CANCELLED: 削除
 */
export function CampaignActions({
  campaign,
  redirectAfterDelete = false,
}: {
  campaign: { id: string; title: string; status: CampaignStatus };
  /** 削除後に一覧へ戻る（詳細ページ用） */
  redirectAfterDelete?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [scheduleOpen, setScheduleOpen] = React.useState(false);
  const [scheduledLocal, setScheduledLocal] = React.useState("");

  function openSchedule() {
    setScheduledLocal(isoToJstInput(addHours(new Date(), 1)));
    setScheduleOpen(true);
  }

  async function handleSchedule() {
    const iso = jstInputToIso(scheduledLocal);
    if (!iso) {
      toast.error("配信予定日時を入力してください");
      return;
    }
    if (new Date(iso).getTime() < Date.now()) {
      toast.error("配信予定日時には現在以降の日時を指定してください");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SCHEDULED", scheduledAt: iso }),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        toast.error(data.error ?? "配信予約に失敗しました");
        return;
      }
      toast.success("配信を予約しました");
      setScheduleOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleSendNow() {
    const ok = window.confirm(
      `「${campaign.title}」を今すぐ配信します。\n対象のお客様のLINEへメッセージが送信され、送信後の取り消しはできません。`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/send`, {
        method: "POST",
      });
      const data: { error?: string; sent?: number; skipped?: number } =
        await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "配信に失敗しました");
        return;
      }
      toast.success(
        `配信が完了しました（送信${formatNumber(data.sent ?? 0)}件・スキップ${formatNumber(
          data.skipped ?? 0,
        )}件）`,
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    const ok = window.confirm(
      `「${campaign.title}」の配信予約を中止します。\n予約した日時になってもメッセージは送信されません。内容は下書きとして残ります。`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        toast.error(data.error ?? "中止に失敗しました");
        return;
      }
      toast.success("配信予約を中止しました");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      `「${campaign.title}」を削除します。\n本文と配信対象の設定は失われ、元に戻せません。`,
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        toast.error(data.error ?? "削除に失敗しました");
        return;
      }
      toast.success("削除しました");
      if (redirectAfterDelete) router.push("/dashboard/campaigns");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const { status } = campaign;
  if (status === "SENT" || status === "SENDING") return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status === "DRAFT" && (
        <Link
          href={`/dashboard/campaigns/${campaign.id}/edit`}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "h-11",
          })}
          aria-label={`「${campaign.title}」を編集`}
        >
          <Pencil aria-hidden="true" />
          編集
        </Link>
      )}
      {status === "DRAFT" && (
        <Button
          variant="outline"
          size="sm"
          className="h-11"
          onClick={openSchedule}
          disabled={busy}
          aria-label={`「${campaign.title}」の配信を予約`}
        >
          <CalendarClock aria-hidden="true" />
          配信予約
        </Button>
      )}
      {(status === "DRAFT" || status === "SCHEDULED") && (
        <Button
          size="sm"
          className="h-11"
          onClick={handleSendNow}
          disabled={busy}
          aria-label={`「${campaign.title}」を今すぐ配信`}
        >
          <Send aria-hidden="true" />
          今すぐ配信
        </Button>
      )}
      {status === "SCHEDULED" && (
        <Button
          variant="ghost"
          size="sm"
          className="h-11 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={handleCancel}
          disabled={busy}
          aria-label={`「${campaign.title}」の配信予約を中止`}
        >
          <XCircle aria-hidden="true" />
          中止
        </Button>
      )}
      {(status === "DRAFT" || status === "CANCELLED") && (
        <Button
          variant="ghost"
          size="sm"
          className="h-11 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={handleDelete}
          disabled={busy}
          aria-label={`「${campaign.title}」を削除`}
        >
          <Trash2 aria-hidden="true" />
          削除
        </Button>
      )}

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>配信を予約</DialogTitle>
            <DialogDescription>
              指定した日時（日本時間）に「{campaign.title}」を自動配信します。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-scheduled-at">
              配信予定日時
              <span className="ml-0.5 text-red-500" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="campaign-scheduled-at"
              type="datetime-local"
              min={nowJstInput()}
              value={scheduledLocal}
              onChange={(e) => setScheduledLocal(e.target.value)}
              required
              aria-required="true"
              aria-describedby="campaign-scheduled-at-help"
            />
            <p
              id="campaign-scheduled-at-help"
              className="text-xs text-gray-500"
            >
              日本時間でご指定ください。現在より後の日時のみ設定できます。
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleOpen(false)}
              disabled={busy}
            >
              キャンセル
            </Button>
            <Button onClick={handleSchedule} disabled={busy}>
              {busy ? "予約中…" : "予約する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
