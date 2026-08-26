import type { BusinessHours } from "@/lib/constants";
import { addMinutes, fromJst, jstDayKey } from "@/lib/jst";

export type SlotReservation = {
  startAt: Date;
  endAt: Date;
  staffId: string | null;
};

export type SlotOptions = {
  businessHours: BusinessHours;
  slotIntervalMin: number;
  durationMin: number;
  /** 対象日 "YYYY-MM-DD"（JST） */
  dateYmd: string;
  /** その日のアクティブ予約（PENDING / CONFIRMED） */
  reservations: SlotReservation[];
  /** 指名スタッフID。null/undefined なら「指名なし」 */
  staffId?: string | null;
  /** アクティブスタッフ数（0なら1として扱う = 店舗キャパ1） */
  staffCount: number;
  /** 現在時刻。これ＋leadTimeMin より前のスロットは除外 */
  now?: Date;
  leadTimeMin?: number;
  /** 臨時休業日（JST "YYYY-MM-DD" の配列）。該当日は空を返す */
  holidays?: string[];
};

function hmToMinutes(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * 指定日の予約可能時間枠（"HH:mm" JST）を返す。
 * - 指名あり: そのスタッフの予約と重ならない枠のみ
 * - 指名なし: 重複予約数 < スタッフ数（キャパ）の枠のみ
 */
export function getAvailableSlots(opts: SlotOptions): string[] {
  const {
    businessHours, slotIntervalMin, durationMin, dateYmd,
    reservations, staffId, staffCount, now, leadTimeMin = 30, holidays,
  } = opts;

  // 臨時休業日は予約不可
  if (holidays && holidays.includes(dateYmd)) return [];

  const dayDate = fromJst(dateYmd, "12:00");
  const hours = businessHours[jstDayKey(dayDate)];
  if (!hours || hours.closed) return [];

  const openMin = hmToMinutes(hours.open);
  const closeMin = hmToMinutes(hours.close);
  if (closeMin <= openMin) return [];

  const capacity = Math.max(1, staffCount);
  const minStart = now ? addMinutes(now, leadTimeMin) : null;
  const slots: string[] = [];

  for (let m = openMin; m + durationMin <= closeMin; m += slotIntervalMin) {
    const hm = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const slotStart = fromJst(dateYmd, hm);
    const slotEnd = addMinutes(slotStart, durationMin);

    if (minStart && slotStart < minStart) continue;

    const overlapping = reservations.filter((r) => overlaps(slotStart, slotEnd, r.startAt, r.endAt));
    if (staffId) {
      // 指名あり: 指名スタッフが空いていること。
      // 担当未定(staffId=null)の予約は誰かのキャパを消費するため、
      // 全体の重複数がキャパに達している場合も不可とする。
      const staffBusy = overlapping.some((r) => r.staffId === staffId);
      if (staffBusy || overlapping.length >= capacity) continue;
    } else {
      if (overlapping.length >= capacity) continue;
    }
    slots.push(hm);
  }
  return slots;
}
