import type { Service, Store } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  DEFAULT_BUSINESS_HOURS,
  type BusinessHours,
  type BusinessHoursDay,
} from "@/lib/constants";
import { DAY_KEYS, addDays, fromJst } from "@/lib/jst";
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

  const [reservations, staffCount] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        storeId: store.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { gte: dayStart, lt: dayEnd },
      },
      select: { startAt: true, endAt: true, staffId: true },
    }),
    prisma.staffMember.count({ where: { storeId: store.id, active: true } }),
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
  });
}
