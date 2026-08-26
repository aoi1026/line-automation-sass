import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_BUSINESS_HOURS, type BusinessHours } from "@/lib/constants";
import { getHolidayYmds } from "@/lib/holidays";
import {
  DAY_LABELS_JA,
  addDays,
  formatJstDate,
  formatJstDateShort,
  fromJst,
  jstDayKey,
  jstHm,
  jstParts,
  jstYmd,
} from "@/lib/jst";
import {
  hmToMin,
  type CalendarBlock,
  type CalendarData,
  type CalendarDay,
  type CalendarView,
} from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 休業日しか無い場合に使う既定の時間軸（10:00〜19:00） */
const FALLBACK_OPEN_MIN = 10 * 60;
const FALLBACK_CLOSE_MIN = 19 * 60;

export function normalizeView(raw: string | undefined): CalendarView {
  return raw === "week" ? "week" : "day";
}

/** 不正な日付は今日（JST）に丸める */
export function normalizeDate(raw: string | undefined, todayYmd: string): string {
  if (!raw || !DATE_RE.test(raw)) return todayYmd;
  const parsed = fromJst(raw);
  if (Number.isNaN(parsed.getTime())) return todayYmd;
  return jstYmd(parsed);
}

/** store.businessHours（Json）を型付きで取り出す。未設定なら既定値 */
export function resolveBusinessHours(raw: Prisma.JsonValue): BusinessHours {
  const isObject = typeof raw === "object" && raw !== null && !Array.isArray(raw);
  if (!isObject || Object.keys(raw as object).length === 0) return DEFAULT_BUSINESS_HOURS;
  return raw as unknown as BusinessHours;
}

/** 月曜はじまりの週の初日を返す */
export function startOfJstWeek(ymd: string): Date {
  const dayStart = fromJst(ymd);
  const mondayOffset = (jstParts(dayStart).weekday + 6) % 7;
  return addDays(dayStart, -mondayOffset);
}

/**
 * タイムグリッド1画面分のデータをまとめて取得する。
 * ページ（server component）とカレンダーAPIの両方から使う。
 */
export async function loadCalendarData(params: {
  storeId: string;
  view: CalendarView;
  /** 基準日（JST "YYYY-MM-DD"、検証済み） */
  date: string;
  now?: Date;
}): Promise<CalendarData> {
  const { storeId, view, date } = params;
  const now = params.now ?? new Date();

  const dayCount = view === "week" ? 7 : 1;
  const rangeStart = view === "week" ? startOfJstWeek(date) : fromJst(date);
  const rangeEnd = addDays(rangeStart, dayCount);

  const [store, reservations, staffMembers, holidayYmds, holidayRecords] = await Promise.all([
    prisma.store.findUnique({
      where: { id: storeId },
      select: { businessHours: true, slotIntervalMin: true },
    }),
    prisma.reservation.findMany({
      where: { storeId, startAt: { gte: rangeStart, lt: rangeEnd } },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        customerId: true,
        staffId: true,
        price: true,
        status: true,
        source: true,
        note: true,
        customer: { select: { name: true } },
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
      orderBy: { startAt: "asc" },
    }),
    prisma.staffMember.findMany({
      where: { storeId, active: true },
      select: { id: true, name: true, title: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    getHolidayYmds(storeId, rangeStart, addDays(rangeStart, dayCount - 1)),
    // 休業理由の表示用（休業日の判定自体は getHolidayYmds に合わせる）
    prisma.storeHoliday.findMany({
      where: { storeId, date: { gte: rangeStart, lt: rangeEnd } },
      select: { date: true, reason: true },
    }),
  ]);

  const businessHours = resolveBusinessHours(store?.businessHours ?? null);
  const slotIntervalMin = Math.max(5, store?.slotIntervalMin || 30);
  const holidaySet = new Set(holidayYmds);
  const holidayReasons = new Map(holidayRecords.map((h) => [jstYmd(h.date), h.reason]));

  // 表示対象の各日（営業時間・休業判定）
  const days: CalendarDay[] = [];
  for (let i = 0; i < dayCount; i++) {
    const d = addDays(rangeStart, i);
    const ymd = jstYmd(d);
    const { month, day } = jstParts(d);
    const hours = businessHours[jstDayKey(d)];
    const isHoliday = holidaySet.has(ymd);
    const isClosed = !hours || hours.closed;

    const openMin = !isClosed && hours ? hmToMin(hours.open) : null;
    const closeMin = !isClosed && hours ? hmToMin(hours.close) : null;
    const valid = openMin !== null && closeMin !== null && closeMin > openMin;

    days.push({
      ymd,
      dateLabel: `${month}/${day}`,
      dayLabel: DAY_LABELS_JA[jstDayKey(d)],
      openMin: isHoliday || !valid ? null : openMin,
      closeMin: isHoliday || !valid ? null : closeMin,
      offKind: isHoliday ? "holiday" : !valid ? "closed" : null,
      offReason: isHoliday ? (holidayReasons.get(ymd) ?? "") : "",
    });
  }

  const blocks: CalendarBlock[] = reservations.map((r) => {
    const parts = jstParts(r.startAt);
    const startMin = parts.hour * 60 + parts.minute;
    const durationMin = Math.max(
      5,
      Math.round((r.endAt.getTime() - r.startAt.getTime()) / 60000)
    );
    return {
      id: r.id,
      ymd: jstYmd(r.startAt),
      startMin,
      endMin: startMin + durationMin,
      startTime: jstHm(r.startAt),
      endTime: jstHm(r.endAt),
      customerId: r.customerId,
      customerName: r.customer.name,
      serviceName: r.service?.name ?? "メニューなし",
      staffId: r.staffId,
      staffName: r.staff?.name ?? "指名なし",
      price: r.price,
      status: r.status,
      source: r.source,
      note: r.note,
    };
  });

  // 時間軸: 営業時間の最小open〜最大close。営業時間外の予約も必ず収まるように広げる
  const opens = days.map((d) => d.openMin).filter((v): v is number => v !== null);
  const closes = days.map((d) => d.closeMin).filter((v): v is number => v !== null);
  let axisStartMin = opens.length > 0 ? Math.min(...opens) : FALLBACK_OPEN_MIN;
  let axisEndMin = closes.length > 0 ? Math.max(...closes) : FALLBACK_CLOSE_MIN;

  for (const block of blocks) {
    axisStartMin = Math.min(axisStartMin, block.startMin);
    axisEndMin = Math.max(axisEndMin, block.endMin);
  }

  axisStartMin = Math.max(0, Math.floor(axisStartMin / slotIntervalMin) * slotIntervalMin);
  axisEndMin = Math.ceil(axisEndMin / slotIntervalMin) * slotIntervalMin;
  if (axisEndMin <= axisStartMin) axisEndMin = axisStartMin + slotIntervalMin;

  const rangeLabel =
    view === "week"
      ? `${formatJstDateShort(rangeStart)}〜${formatJstDateShort(addDays(rangeStart, 6))}`
      : formatJstDate(fromJst(date));

  return {
    view,
    date,
    todayYmd: jstYmd(now),
    rangeLabel,
    days,
    staff: staffMembers,
    blocks,
    axisStartMin,
    axisEndMin,
    slotIntervalMin,
  };
}
