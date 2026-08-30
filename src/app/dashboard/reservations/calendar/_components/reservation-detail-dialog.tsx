"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { ReservationStatus } from "@prisma/client";
import { formatJstDate, fromJst } from "@/lib/jst";
import { formatYen } from "@/lib/utils";
import {
  RESERVATION_SOURCE_LABELS,
  RESERVATION_STATUS_COLORS,
  RESERVATION_STATUS_LABELS,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CalendarBlock } from "./types";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 sm:gap-4">
      <dt className="w-20 shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 flex-1 break-words text-gray-900">{children}</dd>
    </div>
  );
}

/** タイムグリッド上の予約ブロックをクリックしたときの詳細ダイアログ */
export function ReservationDetailDialog({
  block,
  onOpenChange,
}: {
  block: CalendarBlock | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  async function changeStatus(action: "confirm" | "complete", message: string) {
    if (!block) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reservations/${block.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(json.error ?? "ステータスの変更に失敗しました");
        return;
      }
      toast.success(message);
      onOpenChange(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={block !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {block && (
          <>
            <DialogHeader>
              <DialogTitle>予約の詳細</DialogTitle>
              <DialogDescription>
                {formatJstDate(fromJst(block.ymd))} {block.startTime}〜{block.endTime}
              </DialogDescription>
            </DialogHeader>

            <dl className="space-y-3 text-sm">
              <InfoRow label="ステータス">
                <Badge className={RESERVATION_STATUS_COLORS[block.status]}>
                  {RESERVATION_STATUS_LABELS[block.status]}
                </Badge>
              </InfoRow>
              <InfoRow label="顧客">
                <Link
                  href={`/dashboard/customers/${block.customerId}`}
                  className="rounded-sm font-medium text-brand-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                >
                  {block.customerName}
                </Link>
              </InfoRow>
              <InfoRow label="メニュー">{block.serviceName}</InfoRow>
              <InfoRow label="担当">{block.staffName}</InfoRow>
              <InfoRow label="料金">{formatYen(block.price)}</InfoRow>
              <InfoRow label="経路">{RESERVATION_SOURCE_LABELS[block.source]}</InfoRow>
              {block.note && (
                <InfoRow label="メモ">
                  <span className="whitespace-pre-wrap">{block.note}</span>
                </InfoRow>
              )}
            </dl>

            <DialogFooter>
              <Link
                href={`/dashboard/reservations/${block.id}`}
                className={buttonVariants({ variant: "outline" })}
              >
                <ExternalLink aria-hidden="true" />
                詳細ページを開く
              </Link>
              {block.status === "PENDING" && (
                <Button
                  variant="secondary"
                  disabled={submitting}
                  onClick={() => void changeStatus("confirm", "予約を確定しました")}
                >
                  {submitting ? "処理中…" : "確定する"}
                </Button>
              )}
              {(block.status === "PENDING" || block.status === "CONFIRMED") && (
                <Button
                  disabled={submitting}
                  onClick={() => void changeStatus("complete", "来店済みにしました")}
                >
                  {submitting ? "処理中…" : "来店済みにする"}
                </Button>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
