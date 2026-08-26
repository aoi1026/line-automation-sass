"use client";

import Link from "next/link";
import type { MessageChannel, MessageKind, MessageStatus } from "@prisma/client";
import {
  MESSAGE_CHANNEL_LABELS,
  MESSAGE_KIND_LABELS,
  MESSAGE_STATUS_LABELS,
} from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type MessageDetail = {
  id: string;
  sentAtFull: string;
  customerId: string | null;
  customerName: string | null;
  kind: MessageKind;
  content: string;
  channel: MessageChannel;
  status: MessageStatus;
  error: string;
};

/** メッセージ履歴の詳細ダイアログ（LINEのトーク画面風に本文を表示） */
export function MessageDetailDialog({
  message,
  onOpenChange,
}: {
  message: MessageDetail | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={message !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {message && (
          <>
            <DialogHeader>
              <DialogTitle>メッセージ詳細</DialogTitle>
            </DialogHeader>

            <div className="rounded-2xl rounded-tl-sm bg-brand px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words text-white">
              {message.content}
            </div>

            <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-gray-500">顧客</dt>
              <dd className="min-w-0 text-gray-900">
                {message.customerId ? (
                  <Link
                    href={`/dashboard/customers/${message.customerId}`}
                    className="text-brand-dark hover:underline"
                  >
                    {message.customerName}
                  </Link>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </dd>
              <dt className="text-gray-500">種別</dt>
              <dd className="text-gray-900">{MESSAGE_KIND_LABELS[message.kind]}</dd>
              <dt className="text-gray-500">チャネル</dt>
              <dd className="text-gray-900">{MESSAGE_CHANNEL_LABELS[message.channel]}</dd>
              <dt className="text-gray-500">ステータス</dt>
              <dd className="text-gray-900">{MESSAGE_STATUS_LABELS[message.status]}</dd>
              <dt className="text-gray-500">送信日時</dt>
              <dd className="text-gray-900">{message.sentAtFull}</dd>
            </dl>

            {(message.status === "FAILED" || message.status === "SKIPPED") && message.error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {message.error}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
