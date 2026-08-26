"use client";

import * as React from "react";
import Link from "next/link";
import type { MessageChannel, MessageKind, MessageStatus } from "@prisma/client";
import {
  MESSAGE_CHANNEL_LABELS,
  MESSAGE_KIND_LABELS,
  MESSAGE_STATUS_COLORS,
  MESSAGE_STATUS_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MessageDetailDialog, type MessageDetail } from "./message-detail-dialog";

export type MessageRow = MessageDetail & {
  sentAtShort: string;
};

/** チャネルバッジ: LINE=緑, デモ=グレー */
function ChannelBadge({ channel }: { channel: MessageChannel }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        channel === "LINE" ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-600"
      )}
    >
      {MESSAGE_CHANNEL_LABELS[channel]}
    </Badge>
  );
}

/** メッセージ履歴テーブル（デスクトップ: 表、モバイル: カード）。行クリックで詳細ダイアログを開く */
export function MessagesTable({ rows }: { rows: MessageRow[] }) {
  const [selected, setSelected] = React.useState<MessageRow | null>(null);

  return (
    <>
      {/* デスクトップ */}
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>送信日時</TableHead>
              <TableHead>顧客</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>内容</TableHead>
              <TableHead>チャネル</TableHead>
              <TableHead>ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => setSelected(row)}
              >
                <TableCell className="whitespace-nowrap text-gray-600">
                  {row.sentAtShort}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.customerId ? (
                    <Link
                      href={`/dashboard/customers/${row.customerId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-gray-900 hover:text-brand-dark hover:underline"
                    >
                      {row.customerName}
                    </Link>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant="secondary">{MESSAGE_KIND_LABELS[row.kind]}</Badge>
                </TableCell>
                <TableCell className="max-w-[280px] truncate text-gray-600">
                  {row.content}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <ChannelBadge channel={row.channel} />
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Badge variant="secondary" className={MESSAGE_STATUS_COLORS[row.status]}>
                    {MESSAGE_STATUS_LABELS[row.status]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* モバイル: カード表示 */}
      <div className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => setSelected(row)}
            className="w-full rounded-lg border border-gray-100 p-3 text-left transition-colors hover:bg-gray-50/60"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary">{MESSAGE_KIND_LABELS[row.kind]}</Badge>
              <ChannelBadge channel={row.channel} />
              <Badge variant="secondary" className={MESSAGE_STATUS_COLORS[row.status]}>
                {MESSAGE_STATUS_LABELS[row.status]}
              </Badge>
              <span className="ml-auto shrink-0 text-xs text-gray-400">{row.sentAtShort}</span>
            </div>
            <p className="mt-2 truncate text-sm font-medium text-gray-900">
              {row.customerName ?? "-"}
            </p>
            <p className="mt-1 line-clamp-1 text-sm text-gray-600">{row.content}</p>
          </button>
        ))}
      </div>

      <MessageDetailDialog
        message={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}
