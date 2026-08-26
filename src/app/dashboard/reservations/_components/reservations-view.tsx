"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarX2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatYen } from "@/lib/utils";
import { addDays, fromJst, jstYmd } from "@/lib/jst";
import {
  RESERVATION_SOURCE_LABELS,
  RESERVATION_STATUS_COLORS,
  RESERVATION_STATUS_LABELS,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReservationRowActions } from "./reservation-row-actions";
import {
  STATUS_FILTERS,
  type ReservationRow,
  type StatusFilter,
  type WeekDay,
} from "./types";

function shiftYmd(ymd: string, days: number): string {
  return jstYmd(addDays(fromJst(ymd, "12:00"), days));
}

export function ReservationsView({
  date,
  todayYmd,
  status,
  view,
  dateLabel,
  pendingCount,
  dayRows,
  weekDays,
}: {
  date: string;
  todayYmd: string;
  status: StatusFilter;
  view: "day" | "week";
  /** 日別: 「2026年8月26日(水)」 / 週間: 「8月25日(月)〜8月31日(日)」 */
  dateLabel: string;
  /** 表示期間内の未確定（PENDING）件数 */
  pendingCount: number;
  dayRows: ReservationRow[];
  weekDays: WeekDay[];
}) {
  const router = useRouter();

  function navigate(next: { date?: string; status?: StatusFilter; view?: "day" | "week" }) {
    const q = new URLSearchParams();
    q.set("date", next.date ?? date);
    const s = next.status ?? status;
    if (s !== "ALL") q.set("status", s);
    const v = next.view ?? view;
    if (v !== "day") q.set("view", v);
    router.push(`/dashboard/reservations?${q.toString()}`);
  }

  const stepDays = view === "week" ? 7 : 1;

  return (
    <div>
      {/* ツールバー */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs
          value={view}
          onValueChange={(v) => navigate({ view: v === "week" ? "week" : "day" })}
        >
          <TabsList>
            <TabsTrigger value="day">日別</TabsTrigger>
            <TabsTrigger value="week">週間</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          variant="outline"
          size="icon"
          aria-label={view === "week" ? "前週" : "前日"}
          onClick={() => navigate({ date: shiftYmd(date, -stepDays) })}
        >
          <ChevronLeft />
        </Button>
        <Input
          type="date"
          value={date}
          onChange={(e) => {
            if (e.target.value) navigate({ date: e.target.value });
          }}
          className="w-40"
          aria-label="日付を選択"
        />
        <Button
          variant="outline"
          size="icon"
          aria-label={view === "week" ? "翌週" : "翌日"}
          onClick={() => navigate({ date: shiftYmd(date, stepDays) })}
        >
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ date: todayYmd })}
          disabled={view === "day" && date === todayYmd}
        >
          今日
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => navigate({ status: "PENDING" })}
              title="未確定の予約のみ表示"
            >
              <Badge className={RESERVATION_STATUS_COLORS.PENDING}>
                未確定 {pendingCount}件
              </Badge>
            </button>
          )}
          <div className="w-40">
            <Select
              value={status}
              onValueChange={(v) => navigate({ status: v as StatusFilter })}
            >
              <SelectTrigger aria-label="ステータスで絞り込み">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "ALL" ? "すべて" : RESERVATION_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <p className="mb-3 text-sm font-medium text-gray-700">
        {dateLabel}の予約
        {view === "day" && dayRows.length > 0 && (
          <span className="ml-2 text-xs font-normal text-gray-400">{dayRows.length}件</span>
        )}
      </p>

      {view === "day" ? (
        <DayView rows={dayRows} />
      ) : (
        <WeekView days={weekDays} todayYmd={todayYmd} onSelectDay={(ymd) => navigate({ date: ymd, view: "day" })} />
      )}
    </div>
  );
}

function DayView({ rows }: { rows: ReservationRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<CalendarX2 />}
        title="予約なし"
        description="この日の予約はまだ登録されていません。「予約を作成」から登録できます。"
      />
    );
  }

  return (
    <>
      {/* デスクトップ: テーブル */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>時間</TableHead>
              <TableHead>顧客名</TableHead>
              <TableHead>メニュー</TableHead>
              <TableHead>担当</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>経路</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap font-medium text-gray-900">
                  {row.startTime}–{row.endTime}
                </TableCell>
                <TableCell className="whitespace-nowrap text-gray-900">
                  {row.customerName}
                </TableCell>
                <TableCell className="whitespace-nowrap text-gray-600">
                  {row.serviceName}
                </TableCell>
                <TableCell className="whitespace-nowrap text-gray-600">{row.staffName}</TableCell>
                <TableCell className="whitespace-nowrap text-gray-900">
                  {formatYen(row.price)}
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-gray-500">
                  {RESERVATION_SOURCE_LABELS[row.source]}
                </TableCell>
                <TableCell>
                  <Badge className={RESERVATION_STATUS_COLORS[row.status]}>
                    {RESERVATION_STATUS_LABELS[row.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <ReservationRowActions row={row} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* モバイル: カード */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <Card key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {row.startTime}–{row.endTime}
                </p>
                <p className="mt-1 truncate font-medium text-gray-900">{row.customerName}</p>
                <p className="truncate text-sm text-gray-500">
                  {row.serviceName} ／ {row.staffName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Badge className={RESERVATION_STATUS_COLORS[row.status]}>
                  {RESERVATION_STATUS_LABELS[row.status]}
                </Badge>
                <ReservationRowActions row={row} />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-xs text-gray-500">
                {RESERVATION_SOURCE_LABELS[row.source]}
              </span>
              <span className="font-medium text-gray-900">{formatYen(row.price)}</span>
            </div>
            {row.note && <p className="mt-2 text-xs text-gray-500">{row.note}</p>}
          </Card>
        ))}
      </div>
    </>
  );
}

function WeekView({
  days,
  todayYmd,
  onSelectDay,
}: {
  days: WeekDay[];
  todayYmd: string;
  onSelectDay: (ymd: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
      {days.map((day) => (
        <div
          key={day.ymd}
          className={cn(
            "flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm",
            day.ymd === todayYmd ? "border-brand" : "border-gray-200"
          )}
        >
          <button
            type="button"
            onClick={() => onSelectDay(day.ymd)}
            className="border-b border-gray-100 px-3 py-2 text-left transition-colors hover:bg-gray-50"
          >
            <p className="text-xs text-gray-500">
              {day.dayLabel}曜
              {day.ymd === todayYmd && <span className="ml-1 font-medium text-brand">今日</span>}
            </p>
            <p className="text-sm font-semibold text-gray-900">{day.dateLabel}</p>
          </button>
          <div className="flex-1 space-y-1 p-2">
            {day.rows.length === 0 ? (
              <p className="py-3 text-center text-xs text-gray-400">予約なし</p>
            ) : (
              day.rows.map((r) => (
                <div key={r.id} className="rounded-md bg-gray-50 px-2 py-1.5">
                  <p className="truncate text-xs font-medium text-gray-900">
                    {r.startTime} {r.customerName}
                  </p>
                  <div className="mt-0.5 flex items-center justify-between gap-1">
                    <span className="truncate text-[10px] text-gray-500">{r.serviceName}</span>
                    <Badge
                      className={cn(
                        "shrink-0 px-1.5 py-0 text-[10px]",
                        RESERVATION_STATUS_COLORS[r.status]
                      )}
                    >
                      {RESERVATION_STATUS_LABELS[r.status]}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
