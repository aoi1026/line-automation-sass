import type { Store } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, addHours } from "@/lib/jst";
import { loadSetting, sendAutomationMessage } from "@/lib/messaging";
import type { KindCounts } from "./types";
import { emptyCounts, tally } from "./types";

/**
 * 来店お礼（サンクスメッセージ）自動配信:
 * 来店済みになった予約のうち、完了から設定オフセット以上経過し、
 * まだお礼を送っていないものに送信する（送り漏れ防止のため7日前まで遡る）。
 */
export async function runThanks(store: Store, now: Date): Promise<KindCounts> {
  const counts = emptyCounts();
  const setting = await loadSetting(store.id, "THANKS");
  if (!setting?.enabled) return counts;

  const dueBefore =
    setting.offsetUnit === "hours"
      ? addHours(now, -setting.offsetValue)
      : addDays(now, -setting.offsetValue);
  // 送り漏れの取りこぼしに備え、送信予定時刻（dueBefore）から7日前まで遡る。
  // now を基準にすると offsetValue が7日以上のとき範囲が空になり、一度も送信されない。
  const lookbackStart = addDays(dueBefore, -7);

  const reservations = await prisma.reservation.findMany({
    where: {
      storeId: store.id,
      status: "COMPLETED",
      completedAt: { not: null, lte: dueBefore, gte: lookbackStart },
      messageLogs: { none: { kind: "THANKS" } },
    },
    include: { customer: true, service: true, staff: true },
  });

  for (const reservation of reservations) {
    const log = await sendAutomationMessage({
      store, customer: reservation.customer, kind: "THANKS",
      reservation, setting, now,
    });
    tally(counts, log);
  }
  return counts;
}
