import type { Service, Store } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  DEFAULT_BUSINESS_HOURS,
  type BusinessHours,
  type BusinessHoursDay,
} from "@/lib/constants";
import { DAY_KEYS, addDays, fromJst } from "@/lib/jst";
import { getHolidayYmds } from "@/lib/holidays";
import { getAvailableSlots } from "@/lib/slots";

function isBusinessHoursDay(v: unknown): v is BusinessHoursDay {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as BusinessHoursDay).open === "string" &&
    typeof (v as BusinessHoursDay).close === "string" &&
    typeof (v as BusinessHoursDay).closed === "boolean"
  );
}

/** store.businessHours(Json) を安全にパースし、欠損はデフォルトで補完する */
export function resolveBusinessHours(raw: unknown): BusinessHours {
  const merged: BusinessHours = { ...DEFAULT_BUSINESS_HOURS };
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    for (const key of DAY_KEYS) {
      const v = obj[key];
      if (isBusinessHoursDay(v)) merged[key] = v;
    }
  }
  return merged;
}

/**
 * 指定日（JST）の予約可能スロット（"HH:mm"）を計算する。
 * 空き枠API・予約作成時の再検証の両方で同一ロジックを使う。
 * 臨時休業日（StoreHoliday）に該当する日は空配列を返す。
 */
export async function computeDaySlots(params: {
  store: Store;
  service: Service;
  staffId: string | null;
  dateYmd: string;
  now?: Date;
}): Promise<string[]> {
  const { store, service, staffId, dateYmd } = params;
  const dayStart = fromJst(dateYmd);
  const dayEnd = addDays(dayStart, 1);

  const [reservations, staffCount, holidays] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        storeId: store.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { gte: dayStart, lt: dayEnd },
      },
      select: { startAt: true, endAt: true, staffId: true },
    }),
    prisma.staffMember.count({ where: { storeId: store.id, active: true } }),
    // 対象日ぶんだけ取得（StoreHoliday.date はJST 00:00 固定なので完全一致で引ける）
    getHolidayYmds(store.id, dayStart, dayStart),
  ]);

  return getAvailableSlots({
    businessHours: resolveBusinessHours(store.businessHours),
    slotIntervalMin: store.slotIntervalMin,
    durationMin: service.durationMin,
    dateYmd,
    reservations,
    staffId,
    staffCount,
    now: params.now ?? new Date(),
    holidays,
  });
}
