"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { ReservationStatus } from "@prisma/client";
import {
  layoutColumnBlocks,
  minToHm,
  type CalendarBlock,
  type DayOffKind,
  type NewSlotTarget,
} from "./types";

/** 30分 = 40px */
const PX_PER_MIN = 4 / 3;
/** 時間軸（左端）の幅 */
const GUTTER_WIDTH = 56;

/** ステータス別の予約ブロックの配色（RESERVATION_STATUS_COLORS のトーンに合わせる） */
const BLOCK_TONES: Record<ReservationStatus, string> = {
  PENDING: "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200",
  CONFIRMED: "border-sky-300 bg-sky-100 text-sky-900 hover:bg-sky-200",
  COMPLETED: "border-emerald-300 bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
  CANCELLED: "border-gray-300 bg-gray-100 text-gray-500 hover:bg-gray-200",
  NO_SHOW: "border-gray-300 bg-gray-100 text-gray-500 hover:bg-gray-200",
};

const FADED_STATUSES: ReservationStatus[] = ["CANCELLED", "NO_SHOW"];

/** 休業日の斜線背景 */
const STRIPE_STYLE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, rgba(107,114,128,0.16) 0px, rgba(107,114,128,0.16) 6px, transparent 6px, transparent 13px)",
};

const OFF_LABELS: Record<DayOffKind, string> = {
  closed: "定休日",
  holiday: "臨時休業",
};

/** タイムグリッドの1列（日表示=スタッフ / 週表示=日付） */
export type GridColumn = {
  key: string;
  /** 見出し（スタッフ名 / 「8/26」） */
  title: string;
  /** 見出しの補足（肩書き / 「水」） */
  subtitle: string;
  /** この列の日付（JST "YYYY-MM-DD"） */
  ymd: string;
  /** この列の担当スタッフ（null = 指名なし） */
  staffId: string | null;
  /** 今日の列か */
  today: boolean;
  /** 営業時間（JST 00:00からの分）。休業日は null */
  openMin: number | null;
  closeMin: number | null;
  offKind: DayOffKind | null;
  offReason: string;
  blocks: CalendarBlock[];
};

export function CalendarGrid({
  columns,
  axisStartMin,
  axisEndMin,
  slotIntervalMin,
  nowMin,
  columnMinWidth,
  showStaffName,
  scrollKey,
  onSelectBlock,
  onSelectSlot,
}: {
  columns: GridColumn[];
  axisStartMin: number;
  axisEndMin: number;
  slotIntervalMin: number;
  /** 現在時刻（JST 00:00からの分）。今日を含まない表示なら null */
  nowMin: number | null;
  columnMinWidth: number;
  /** ブロック内に担当者名を表示するか（週表示） */
  showStaffName: boolean;
  /** この値が変わったときに初期スクロール位置を再計算する */
  scrollKey: string;
  onSelectBlock: (block: CalendarBlock) => void;
  onSelectSlot: (target: NewSlotTarget) => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const totalHeight = (axisEndMin - axisStartMin) * PX_PER_MIN;
  const rowHeight = slotIntervalMin * PX_PER_MIN;

  const rows = React.useMemo(() => {
    const result: number[] = [];
    for (let m = axisStartMin; m < axisEndMin; m += slotIntervalMin) result.push(m);
    return result;
  }, [axisStartMin, axisEndMin, slotIntervalMin]);

  // 初期表示位置: 現在時刻（今日を表示中）または営業開始の少し手前へ
  const firstOpenMin = columns.reduce<number | null>(
    (acc, col) => (col.openMin === null ? acc : acc === null ? col.openMin : Math.min(acc, col.openMin)),
    null
  );
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = nowMin ?? firstOpenMin ?? axisStartMin;
    const top = (target - axisStartMin) * PX_PER_MIN - 80;
    el.scrollTop = Math.max(0, top);
    // scrollKey（表示単位・日付）が変わったときだけ位置を戻す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollKey]);

  const showNowLine = nowMin !== null && nowMin >= axisStartMin && nowMin <= axisEndMin;
  const nowTop = nowMin !== null ? (nowMin - axisStartMin) * PX_PER_MIN : 0;

  return (
    <div
      ref={scrollRef}
      className="relative max-h-[calc(100vh-19rem)] min-h-[24rem] overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <div style={{ width: "max-content", minWidth: "100%" }}>
        {/* ヘッダー行 */}
        <div className="sticky top-0 z-30 flex">
          <div
            className="sticky left-0 z-40 border-b border-r border-gray-200 bg-white"
            style={{ flex: "0 0 auto", width: GUTTER_WIDTH, minWidth: GUTTER_WIDTH }}
          />
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn(
                "border-b border-r border-gray-200 bg-white px-2 py-2 text-center",
                col.today && "bg-brand-light"
              )}
              style={{ flex: "1 1 auto", width: columnMinWidth, minWidth: columnMinWidth }}
            >
              <p className="truncate text-sm font-semibold text-gray-900">{col.title}</p>
              <p className="truncate text-xs text-gray-500">
                {col.subtitle}
                {col.today && <span className="ml-1 font-medium text-brand">今日</span>}
              </p>
            </div>
          ))}
        </div>

        {/* 本体 */}
        <div className="flex">
          {/* 時間軸 */}
          <div
            className="sticky left-0 z-20 border-r border-gray-200 bg-white"
            style={{
              flex: "0 0 auto",
              width: GUTTER_WIDTH,
              minWidth: GUTTER_WIDTH,
              height: totalHeight,
            }}
          >
            <div className="relative h-full">
              {rows.map((m) => (
                <div
                  key={m}
                  className={cn(
                    "absolute inset-x-0 border-t pr-1.5 text-right text-[11px] leading-none",
                    m % 60 === 0
                      ? "border-gray-200 font-medium text-gray-600"
                      : "border-transparent text-gray-400"
                  )}
                  style={{ top: (m - axisStartMin) * PX_PER_MIN, height: rowHeight }}
                >
                  <span className="relative -top-[5px]">
                    {m % 60 === 0 || slotIntervalMin >= 30 ? minToHm(m) : ""}
                  </span>
                </div>
              ))}
              {showNowLine && (
                <div
                  className="absolute right-1 z-30 -translate-y-1/2 rounded bg-red-500 px-1 py-0.5 text-[10px] font-medium leading-none text-white"
                  style={{ top: nowTop }}
                >
                  {minToHm(nowMin ?? 0)}
                </div>
              )}
            </div>
          </div>

          {/* 各列 */}
          {columns.map((col) => (
            <GridColumnBody
              key={col.key}
              column={col}
              rows={rows}
              rowHeight={rowHeight}
              totalHeight={totalHeight}
              axisStartMin={axisStartMin}
              columnMinWidth={columnMinWidth}
              showStaffName={showStaffName}
              nowTop={showNowLine && col.today ? nowTop : null}
              onSelectBlock={onSelectBlock}
              onSelectSlot={onSelectSlot}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function GridColumnBody({
  column,
  rows,
  rowHeight,
  totalHeight,
  axisStartMin,
  columnMinWidth,
  showStaffName,
  nowTop,
  onSelectBlock,
  onSelectSlot,
}: {
  column: GridColumn;
  rows: number[];
  rowHeight: number;
  totalHeight: number;
  axisStartMin: number;
  columnMinWidth: number;
  showStaffName: boolean;
  nowTop: number | null;
  onSelectBlock: (block: CalendarBlock) => void;
  onSelectSlot: (target: NewSlotTarget) => void;
}) {
  const positioned = React.useMemo(() => layoutColumnBlocks(column.blocks), [column.blocks]);
  const off = column.offKind !== null;

  return (
    <div
      className="relative border-r border-gray-200"
      style={{
        flex: "1 1 auto",
        width: columnMinWidth,
        minWidth: columnMinWidth,
        height: totalHeight,
        ...(off ? STRIPE_STYLE : {}),
      }}
    >
      {/* 時間枠 */}
      {rows.map((m) => {
        const outsideHours =
          column.openMin === null ||
          column.closeMin === null ||
          m < column.openMin ||
          m >= column.closeMin;
        return (
          <button
            key={m}
            type="button"
            disabled={off}
            onClick={() =>
              onSelectSlot({ ymd: column.ymd, time: minToHm(m), staffId: column.staffId })
            }
            aria-label={`${column.title} ${minToHm(m)} に予約を作成`}
            className={cn(
              "absolute inset-x-0 border-t transition-colors",
              m % 60 === 0 ? "border-gray-200" : "border-gray-100",
              off
                ? "cursor-default"
                : outsideHours
                  ? "bg-gray-50/80 hover:bg-brand/5"
                  : "hover:bg-brand/5"
            )}
            style={{ top: (m - axisStartMin) * PX_PER_MIN, height: rowHeight }}
          />
        );
      })}

      {/* 休業表示 */}
      {off && column.offKind && (
        <div className="pointer-events-none absolute inset-x-1 top-3 z-10 text-center">
          <span className="inline-block rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-gray-600 shadow-sm">
            {OFF_LABELS[column.offKind]}
          </span>
          {column.offReason && (
            <span className="mt-1 block truncate text-[11px] text-gray-500">
              {column.offReason}
            </span>
          )}
        </div>
      )}

      {/* 予約ブロック */}
      {positioned.map(({ block, lane, lanes }) => (
        <ReservationBlock
          key={block.id}
          block={block}
          lane={lane}
          lanes={lanes}
          axisStartMin={axisStartMin}
          showStaffName={showStaffName}
          onSelect={onSelectBlock}
        />
      ))}

      {/* 現在時刻 */}
      {nowTop !== null && (
        <div
          className="pointer-events-none absolute inset-x-0 z-[15] border-t-2 border-red-500"
          style={{ top: nowTop }}
        />
      )}
    </div>
  );
}

function ReservationBlock({
  block,
  lane,
  lanes,
  axisStartMin,
  showStaffName,
  onSelect,
}: {
  block: CalendarBlock;
  lane: number;
  lanes: number;
  axisStartMin: number;
  showStaffName: boolean;
  onSelect: (block: CalendarBlock) => void;
}) {
  const top = (block.startMin - axisStartMin) * PX_PER_MIN;
  const height = Math.max(22, (block.endMin - block.startMin) * PX_PER_MIN);
  const faded = FADED_STATUSES.includes(block.status);
  const compact = height < 34;

  return (
    <button
      type="button"
      onClick={() => onSelect(block)}
      title={`${block.startTime}〜${block.endTime} ${block.customerName}様 / ${block.serviceName}`}
      className={cn(
        "absolute z-10 overflow-hidden rounded-md border px-1.5 py-0.5 text-left shadow-sm transition-colors",
        BLOCK_TONES[block.status],
        faded && "opacity-75"
      )}
      style={{
        top,
        height,
        left: `calc(${(lane / lanes) * 100}% + 2px)`,
        width: `calc(${100 / lanes}% - 4px)`,
      }}
    >
      {compact ? (
        <p className="truncate text-[10px] font-medium leading-[18px]">
          {block.startTime} {block.customerName}
        </p>
      ) : (
        <>
          <p className="truncate text-[10px] font-semibold leading-tight">
            {block.startTime}–{block.endTime}
          </p>
          <p className={cn("truncate text-xs font-medium leading-tight", faded && "line-through")}>
            {block.customerName}
          </p>
          {height >= 58 && (
            <p className="truncate text-[10px] leading-tight opacity-80">{block.serviceName}</p>
          )}
          {showStaffName && height >= 78 && (
            <p className="truncate text-[10px] leading-tight opacity-70">{block.staffName}</p>
          )}
        </>
      )}
    </button>
  );
}
