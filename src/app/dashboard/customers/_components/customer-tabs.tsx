"use client";

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
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
      <TabsList>
        <TabsTrigger value="reservations">予約履歴</TabsTrigger>
        <TabsTrigger value="messages">送信履歴</TabsTrigger>
      </TabsList>

      <TabsContent value="reservations">
        {reservations.length === 0 ? (
          <EmptyState icon={<CalendarClock />} title="予約履歴がありません" />
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
                    <TableCell className="whitespace-nowrap">{r.startAtLabel}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.serviceName}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.staffName}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">{r.priceLabel}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                          RESERVATION_STATUS_COLORS[r.status]
                        )}
                      >
                        {RESERVATION_STATUS_LABELS[r.status]}
                      </span>
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
          <EmptyState icon={<MessageSquareText />} title="送信履歴がありません" />
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
                    <TableCell className="whitespace-nowrap">{m.sentAtLabel}</TableCell>
                    <TableCell className="whitespace-nowrap">{MESSAGE_KIND_LABELS[m.kind]}</TableCell>
                    <TableCell className="max-w-xs truncate" title={m.content}>
                      {m.content}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
                          MESSAGE_STATUS_COLORS[m.status]
                        )}
                      >
                        {MESSAGE_STATUS_LABELS[m.status]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {m.channel === "DEMO" ? (
                        <Badge variant="secondary">デモ</Badge>
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
