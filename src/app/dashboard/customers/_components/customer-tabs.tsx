"use client";

import Link from "next/link";
import type { MessageChannel, MessageKind, MessageStatus, ReservationStatus } from "@prisma/client";
import { CalendarClock, MessageSquareText } from "lucide-react";
import {
  MESSAGE_CHANNEL_LABELS,
  MESSAGE_KIND_LABELS,
  MESSAGE_STATUS_COLORS,
  MESSAGE_STATUS_LABELS,
  RESERVATION_STATUS_COLORS,
  RESERVATION_STATUS_LABELS,
} from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ReservationRow = {
  id: string;
  startAtLabel: string;
  serviceName: string;
  staffName: string;
  priceLabel: string;
  status: ReservationStatus;
};

export type MessageLogRow = {
  id: string;
  sentAtLabel: string;
  kind: MessageKind;
  content: string;
  status: MessageStatus;
  channel: MessageChannel;
};

const LINK_FOCUS =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50";

/** 顧客詳細の予約履歴／送信履歴タブ */
export function CustomerTabs({
  reservations,
  messageLogs,
}: {
  reservations: ReservationRow[];
  messageLogs: MessageLogRow[];
}) {
  return (
    <Tabs defaultValue="reservations">
      <TabsList aria-label="履歴の種類">
        <TabsTrigger value="reservations">
          予約履歴
          {reservations.length > 0 && (
            <span className="ml-1.5 text-xs font-normal tabular-nums text-gray-400">
              {formatNumber(reservations.length)}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="messages">
          送信履歴
          {messageLogs.length > 0 && (
            <span className="ml-1.5 text-xs font-normal tabular-nums text-gray-400">
              {formatNumber(messageLogs.length)}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="reservations">
        {reservations.length === 0 ? (
          <EmptyState
            icon={<CalendarClock aria-hidden="true" />}
            title="予約履歴はまだありません"
            description="このお客様の予約を登録すると、来店の記録がここに残ります。"
            action={
              <Link
                href="/dashboard/reservations"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                予約を登録
              </Link>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>メニュー</TableHead>
                  <TableHead>担当</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>ステータス</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={`/dashboard/reservations/${r.id}`}
                        className={`font-medium text-gray-900 hover:text-brand-dark hover:underline ${LINK_FOCUS}`}
                      >
                        {r.startAtLabel}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-gray-600">
                      {r.serviceName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-gray-600">{r.staffName}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {r.priceLabel}
                    </TableCell>
                    <TableCell>
                      <Badge className={RESERVATION_STATUS_COLORS[r.status]}>
                        {RESERVATION_STATUS_LABELS[r.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>

      <TabsContent value="messages">
        {messageLogs.length === 0 ? (
          <EmptyState
            icon={<MessageSquareText aria-hidden="true" />}
            title="送信履歴はまだありません"
            description="LINEでメッセージをお送りすると、送信の記録がここに残ります。"
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>チャネル</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messageLogs.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {m.sentAtLabel}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {MESSAGE_KIND_LABELS[m.kind]}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-gray-600" title={m.content}>
                      {m.content}
                    </TableCell>
                    <TableCell>
                      <Badge className={MESSAGE_STATUS_COLORS[m.status]}>
                        {MESSAGE_STATUS_LABELS[m.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {m.channel === "DEMO" ? (
                        <Badge variant="secondary">{MESSAGE_CHANNEL_LABELS.DEMO}</Badge>
                      ) : (
                        <Badge variant="outline">{MESSAGE_CHANNEL_LABELS[m.channel]}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
