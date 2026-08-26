import type { Store } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, addHours } from "@/lib/jst";
import { loadSetting, sendAutomationMessage } from "@/lib/messaging";
import type { KindCounts } from "./types";
import { emptyCounts, tally } from "./types";

/**
 * リマインダー自動配信:
 * 確定済み予約のうち、開始時刻が「現在〜設定オフセット後」の範囲にあり、
 * まだリマインダーを送っていないものに送信する。
 */
export async function runReminders(store: Store, now: Date): Promise<KindCounts> {
  const counts = emptyCounts();
  const setting = await loadSetting(store.id, "REMINDER");
  if (!setting?.enabled) return counts;

  const windowEnd =
    setting.offsetUnit === "hours"
      ? addHours(now, setting.offsetValue)
      : addDays(now, setting.offsetValue);

  const reservations = await prisma.reservation.findMany({
    where: {
      storeId: store.id,
      status: "CONFIRMED",
      startAt: { gt: now, lte: windowEnd },
      messageLogs: { none: { kind: "REMINDER" } },
    },
    include: { customer: true, service: true, staff: true },
  });

  for (const reservation of reservations) {
    const log = await sendAutomationMessage({
      store, customer: reservation.customer, kind: "REMINDER",
      reservation, setting, now,
    });
    tally(counts, log);
  }
  return counts;
}
