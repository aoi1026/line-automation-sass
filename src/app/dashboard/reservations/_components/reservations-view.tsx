"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarRange, CalendarX2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatNumber, formatYen } from "@/lib/utils";
import { addDays, fromJst, jstYmd } from "@/lib/jst";
import {
  RESERVATION_SOURCE_LABELS,
  RESERVATION_STATUS_COLORS,
  RESERVATION_STATUS_LABELS,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  type ReservationView,
  type StatusFilter,
  type WeekDay,
} from "./types";

/** 一覧内のリンクに共通のフォーカスリング */
const LINK_FOCUS =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50";

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
  listRows,
  listLimited = false,
  weekDays,
  createAction,
}: {
  date: string;
  todayYmd: string;
  status: StatusFilter;
  view: ReservationView;
  /** 日別: 「2026年8月26日(水)」 / 週間: 「8月25日(月)〜8月31日(日)」 / 今後: 「2026年8月26日(水)以降」 */
  dateLabel: string;
  /** 表示期間内の未確定（PENDING）件数 */
  pendingCount: number;
  /** 日別・今後の予約で一覧表示する行（週間ビューでは空） */
  listRows: ReservationRow[];
  /** 今後の予約が上限件数で打ち切られているか */
  listLimited?: boolean;
  weekDays: WeekDay[];
  /** 予約が0件のときに空状態へ出す操作（予約作成ダイアログ） */
  createAction?: React.ReactNode;
}) {
  const router = useRouter();

  function navigate(next: { date?: string; status?: StatusFilter; view?: ReservationView }) {
    const q = new URLSearchParams();
    const v = next.view ?? view;
    // 今後の予約は日付で絞り込まないため、date は付けない
    if (v !== "upcoming") q.set("date", next.date ?? date);
    const s = next.status ?? status;
    if (s !== "ALL") q.set("status", s);
    if (v !== "day") q.set("view", v);
    router.push(`/dashboard/reservations?${q.toString()}`);
  }

  /** 一覧の表示単位を切り替える */
  function changeView(value: string) {
    navigate({ view: value === "week" ? "week" : value === "upcoming" ? "upcoming" : "day" });
  }

  const stepDays = view === "week" ? 7 : 1;
  const unit = view === "week" ? "週" : "日";

  return (
    <div>
      {/* ツールバー */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs value={view} onValueChange={changeView}>
          <TabsList aria-label="一覧の表示切り替え">
            <TabsTrigger value="day">日別</TabsTrigger>
            <TabsTrigger value="week">週間</TabsTrigger>
            <TabsTrigger value="upcoming">今後</TabsTrigger>
          </TabsList>
        </Tabs>
        {/* タイムグリッドのカレンダー表示へ（カレンダー側に「一覧に戻る」あり） */}
        <Link
          href={`/dashboard/reservations/calendar?date=${date}`}
          aria-label="カレンダー表示に切り替え"
          className={buttonVariants({ variant: "outline" })}
        >
          <CalendarRange aria-hidden="true" />
          カレンダー
        </Link>
        {view !== "upcoming" && (
          <>
            <Button
              variant="outline"
              size="icon"
              aria-label={`前の${unit}へ`}
              onClick={() => navigate({ date: shiftYmd(date, -stepDays) })}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <div className="w-36 shrink-0 sm:w-40">
              <Label htmlFor="reservations-date" className="sr-only">
                表示する日付
              </Label>
              <Input
                id="reservations-date"
                type="date"
                value={date}
                onChange={(e) => {
                  if (e.target.value) navigate({ date: e.target.value });
                }}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              aria-label={`次の${unit}へ`}
              onClick={() => navigate({ date: shiftYmd(date, stepDays) })}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              className="h-10"
              aria-label="今日へ移動"
              onClick={() => navigate({ date: todayYmd })}
              disabled={view === "day" && date === todayYmd}
            >
              今日
            </Button>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => navigate({ status: "PENDING" })}
              aria-label={`未確定の予約${formatNumber(pendingCount)}件のみ表示`}
              className="inline-flex h-10 items-center rounded-full px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            >
              <Badge className={RESERVATION_STATUS_COLORS.PENDING}>
                未確定 {formatNumber(pendingCount)}件
              </Badge>
            </button>
          )}
          <div className="w-36 sm:w-40">
            <Label htmlFor="reservations-status" className="sr-only">
              ステータスで絞り込み
            </Label>
            <Select
              value={status}
              onValueChange={(v) => navigate({ status: v as StatusFilter })}
            >
              <SelectTrigger id="reservations-status">
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
        {view !== "week" && listRows.length > 0 && (
          <span className="ml-2 text-xs font-normal text-gray-400">
            {formatNumber(listRows.length)}件
            {listLimited && "（上限まで表示中）"}
          </span>
        )}
      </p>

      {view === "week" ? (
        <WeekView
          days={weekDays}
          todayYmd={todayYmd}
          onSelectDay={(ymd) => navigate({ date: ymd, view: "day" })}
        />
      ) : (
        <ListView
          rows={listRows}
          status={status}
          upcoming={view === "upcoming"}
          createAction={createAction}
          onResetFilter={() => navigate({ status: "ALL" })}
        />
      )}
    </div>
  );
}

/** 日別・今後の予約の一覧（今後の予約では日付列を表示する） */
function ListView({
  rows,
  status,
  upcoming,
  createAction,
  onResetFilter,
}: {
  rows: ReservationRow[];
  status: StatusFilter;
  /** 今後の予約（日付をまたぐ）表示か */
  upcoming: boolean;
  createAction?: React.ReactNode;
  onResetFilter: () => void;
}) {
  if (rows.length === 0) {
    // 絞り込み中は「条件に合う予約がない」ことを伝える（登録を促さない）
    if (status !== "ALL") {
      return (
        <EmptyState
          icon={<CalendarX2 aria-hidden="true" />}
          title="条件に合う予約がありません"
          description={
            upcoming
              ? `今日以降に「${RESERVATION_STATUS_LABELS[status]}」の予約はありません。絞り込みを解除すると、ほかの予約を確認できます。`
              : `この日に「${RESERVATION_STATUS_LABELS[status]}」の予約はありません。絞り込みを解除すると、ほかの予約を確認できます。`
          }
          action={
            <Button variant="outline" size="sm" onClick={onResetFilter}>
              絞り込みを解除
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={<CalendarX2 aria-hidden="true" />}
        title={upcoming ? "今後の予約はまだありません" : "この日の予約はまだありません"}
        description="「予約を作成」から、お客様・メニュー・時刻を選んで登録できます。"
        action={createAction}
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
              {upcoming && <TableHead>日付</TableHead>}
              <TableHead>時間</TableHead>
              <TableHead>顧客名</TableHead>
              <TableHead>メニュー</TableHead>
              <TableHead>担当</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead>経路</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">操作</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {upcoming && (
                  <TableCell className="whitespace-nowrap text-gray-600">{row.dateLabel}</TableCell>
                )}
                <TableCell className="whitespace-nowrap font-medium tabular-nums text-gray-900">
                  {row.startTime}–{row.endTime}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  <Link
                    href={`/dashboard/reservations/${row.id}`}
                    className={cn(
                      "font-medium text-gray-900 hover:text-brand-dark hover:underline",
                      LINK_FOCUS
                    )}
                  >
                    {row.customerName}
                  </Link>
                </TableCell>
                <TableCell className="whitespace-nowrap text-gray-600">
                  {row.serviceName}
                </TableCell>
                <TableCell className="whitespace-nowrap text-gray-600">{row.staffName}</TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums text-gray-900">
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
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tabular-nums text-gray-900">
                  {upcoming && <span className="mr-1.5 font-medium">{row.dateLabel}</span>}
                  {row.startTime}–{row.endTime}
                </p>
                <Link
                  href={`/dashboard/reservations/${row.id}`}
                  className={cn("mt-1 block truncate font-medium text-gray-900", LINK_FOCUS)}
                >
                  {row.customerName}
                </Link>
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
              <span className="font-medium tabular-nums text-gray-900">
                {formatYen(row.price)}
              </span>
            </div>
            {row.note && (
              <p className="mt-2 break-words text-xs text-gray-500">{row.note}</p>
            )}
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
            "flex min-w-0 flex-col overflow-hidden rounded-xl border bg-white shadow-sm",
            day.ymd === todayYmd ? "border-brand" : "border-gray-200"
          )}
        >
          <button
            type="button"
            onClick={() => onSelectDay(day.ymd)}
            aria-label={`${day.dateLabel}（${day.dayLabel}曜）の予約を日別で表示`}
            className="border-b border-gray-100 px-3 py-2 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50"
          >
            <p className="truncate text-xs text-gray-500">
              {day.dayLabel}曜
              {day.ymd === todayYmd && <span className="ml-1 font-medium text-brand">今日</span>}
            </p>
            <p className="truncate text-sm font-semibold tabular-nums text-gray-900">
              {day.dateLabel}
            </p>
          </button>
          <div className="flex-1 space-y-1 p-2">
            {day.rows.length === 0 ? (
              <p className="py-3 text-center text-xs text-gray-400">予約なし</p>
            ) : (
              day.rows.map((r) => (
                <Link
                  key={r.id}
                  href={`/dashboard/reservations/${r.id}`}
                  className="block rounded-md bg-gray-50 px-2 py-1.5 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                >
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
                </Link>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
