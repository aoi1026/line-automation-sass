"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, fromJst, jstParts, jstYmd } from "@/lib/jst";
import { RESERVATION_STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarGrid, type GridColumn } from "./calendar-grid";
import { NewReservationDialog } from "./new-reservation-dialog";
import { ReservationDetailDialog } from "./reservation-detail-dialog";
import {
  type CalendarBlock,
  type CalendarData,
  type CalendarView as CalendarViewMode,
  type CustomerOption,
  type NewSlotTarget,
  type ServiceOption,
} from "./types";

const ALL_STAFF = "all";

/** 凡例に表示するステータスと色 */
const LEGEND: { key: keyof typeof RESERVATION_STATUS_LABELS; dot: string }[] = [
  { key: "CONFIRMED", dot: "bg-sky-300" },
  { key: "PENDING", dot: "bg-amber-300" },
  { key: "COMPLETED", dot: "bg-emerald-300" },
  { key: "CANCELLED", dot: "bg-gray-300" },
];

function shiftYmd(ymd: string, days: number): string {
  return jstYmd(addDays(fromJst(ymd, "12:00"), days));
}

export function CalendarView({
  data,
  staffId,
  customers,
  services,
}: {
  data: CalendarData;
  /** 絞り込み中のスタッフID（未指定なら null） */
  staffId: string | null;
  customers: CustomerOption[];
  services: ServiceOption[];
}) {
  const router = useRouter();

  const [isMobile, setIsMobile] = React.useState(false);
  const [nowMin, setNowMin] = React.useState<number | null>(null);
  const [selectedBlock, setSelectedBlock] = React.useState<CalendarBlock | null>(null);
  const [newSlot, setNewSlot] = React.useState<NewSlotTarget | null>(null);

  // モバイルは日表示のみ
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // 現在時刻（JST 0:00からの分）を1分ごとに更新
  React.useEffect(() => {
    const update = () => {
      const { hour, minute } = jstParts(new Date());
      setNowMin(hour * 60 + minute);
    };
    update();
    const timer = window.setInterval(update, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const view: CalendarViewMode = isMobile ? "day" : data.view;

  function navigate(next: { view?: CalendarViewMode; date?: string; staffId?: string | null }) {
    const q = new URLSearchParams();
    const nextView = next.view ?? data.view;
    if (nextView !== "day") q.set("view", nextView);
    q.set("date", next.date ?? data.date);
    const nextStaffId = next.staffId !== undefined ? next.staffId : staffId;
    if (nextStaffId) q.set("staffId", nextStaffId);
    router.push(`/dashboard/reservations/calendar?${q.toString()}`);
  }

  const columns: GridColumn[] = React.useMemo(() => {
    if (view === "week") {
      const blocks = staffId ? data.blocks.filter((b) => b.staffId === staffId) : data.blocks;
      return data.days.map((day) => ({
        key: day.ymd,
        title: day.dateLabel,
        subtitle: `${day.dayLabel}曜`,
        ymd: day.ymd,
        staffId,
        today: day.ymd === data.todayYmd,
        openMin: day.openMin,
        closeMin: day.closeMin,
        offKind: day.offKind,
        offReason: day.offReason,
        blocks: blocks.filter((b) => b.ymd === day.ymd),
      }));
    }

    const day = data.days.find((d) => d.ymd === data.date) ?? data.days[0];
    const dayBlocks = data.blocks.filter((b) => b.ymd === day.ymd);
    const base = {
      ymd: day.ymd,
      today: day.ymd === data.todayYmd,
      openMin: day.openMin,
      closeMin: day.closeMin,
      offKind: day.offKind,
      offReason: day.offReason,
    };

    const visibleStaff = staffId ? data.staff.filter((s) => s.id === staffId) : data.staff;
    const staffColumns: GridColumn[] = visibleStaff.map((s) => ({
      ...base,
      key: s.id,
      title: s.name,
      subtitle: s.title,
      staffId: s.id,
      blocks: dayBlocks.filter((b) => b.staffId === s.id),
    }));

    if (staffId) return staffColumns;

    // 指名なし（退職済みスタッフの予約もここにまとめる）
    const staffIds = new Set(data.staff.map((s) => s.id));
    const unassigned = dayBlocks.filter((b) => b.staffId === null || !staffIds.has(b.staffId));
    if (unassigned.length > 0 || staffColumns.length === 0) {
      staffColumns.push({
        ...base,
        key: "unassigned",
        title: "指名なし",
        subtitle: "担当未定",
        staffId: null,
        blocks: unassigned,
      });
    }
    return staffColumns;
  }, [view, data, staffId]);

  const hasToday = columns.some((c) => c.today);
  const visibleCount = columns.reduce((sum, c) => sum + c.blocks.length, 0);
  const stepDays = view === "week" ? 7 : 1;
  const newSlotKey = newSlot
    ? `${newSlot.ymd}-${newSlot.time}-${newSlot.staffId ?? ""}`
    : "closed";

  return (
    <div>
      {/* ツールバー */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="hidden md:block">
          <Tabs
            value={data.view}
            onValueChange={(v) => navigate({ view: v === "week" ? "week" : "day" })}
          >
            <TabsList>
              <TabsTrigger value="day">日表示</TabsTrigger>
              <TabsTrigger value="week">週表示</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Button
          variant="outline"
          size="icon"
          aria-label={view === "week" ? "前の週" : "前の日"}
          onClick={() => navigate({ date: shiftYmd(data.date, -stepDays) })}
        >
          <ChevronLeft />
        </Button>
        <Input
          type="date"
          value={data.date}
          onChange={(e) => {
            if (e.target.value) navigate({ date: e.target.value });
          }}
          className="w-40"
          aria-label="日付を選択"
        />
        <Button
          variant="outline"
          size="icon"
          aria-label={view === "week" ? "次の週" : "次の日"}
          onClick={() => navigate({ date: shiftYmd(data.date, stepDays) })}
        >
          <ChevronRight />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ date: data.todayYmd })}
          disabled={data.date === data.todayYmd}
        >
          今日
        </Button>

        <div className="ml-auto w-44">
          <Select
            value={staffId ?? ALL_STAFF}
            onValueChange={(v) => navigate({ staffId: v === ALL_STAFF ? null : v })}
          >
            <SelectTrigger aria-label="スタッフで絞り込み">
              <SelectValue placeholder="スタッフ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STAFF}>すべてのスタッフ</SelectItem>
              {data.staff.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 期間ラベルと凡例 */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-sm font-medium text-gray-700">
          {data.rangeLabel}
          <span className="ml-2 text-xs font-normal text-gray-400">{visibleCount}件</span>
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {LEGEND.map((item) => (
            <span key={item.key} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
              {RESERVATION_STATUS_LABELS[item.key]}
            </span>
          ))}
        </div>
      </div>

      <CalendarGrid
        columns={columns}
        axisStartMin={data.axisStartMin}
        axisEndMin={data.axisEndMin}
        slotIntervalMin={data.slotIntervalMin}
        nowMin={hasToday ? nowMin : null}
        columnMinWidth={view === "week" ? 128 : 152}
        showStaffName={view === "week"}
        scrollKey={`${view}-${data.date}-${staffId ?? ""}`}
        onSelectBlock={setSelectedBlock}
        onSelectSlot={setNewSlot}
      />

      <p className="mt-3 text-xs text-gray-500">
        予約ブロックをクリックすると詳細を表示します。空いている枠をクリックすると、その日時・担当で予約を作成できます。
      </p>

      <ReservationDetailDialog
        block={selectedBlock}
        onOpenChange={(open) => {
          if (!open) setSelectedBlock(null);
        }}
      />
      <NewReservationDialog
        key={newSlotKey}
        target={newSlot}
        customers={customers}
        services={services}
        staffMembers={data.staff}
        slotIntervalMin={data.slotIntervalMin}
        onOpenChange={(open) => {
          if (!open) setNewSlot(null);
        }}
      />
    </div>
  );
}
