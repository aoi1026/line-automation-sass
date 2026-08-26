import type { Store } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, getJstHour } from "@/lib/jst";
import { loadSetting, sendAutomationMessage } from "@/lib/messaging";
import type { KindCounts } from "./types";
import { emptyCounts, tally } from "./types";

/**
 * 再来店リマインド自動配信:
 * 最終来店からの経過日数が「最後に受けたメニューの推奨間隔（未設定なら店舗デフォルト）」を
 * 超えた顧客に、次回来店のご案内を送信する。
 * - 今後の予約が既に入っている顧客には送らない
 * - 最終来店から180日以上経過した顧客には送らない（休眠顧客はキャンペーンで対応）
 * - 同一来店サイクル内での重複送信はしない（最終来店以降に送信済みならスキップ）
 * - 設定された送信時刻（JST）以降の実行時のみ送信
 */
export async function runRebooking(store: Store, now: Date): Promise<KindCounts> {
  const counts = emptyCounts();
  const setting = await loadSetting(store.id, "REBOOKING");
  if (!setting?.enabled) return counts;
  if (getJstHour(now) < setting.sendHourJst) return counts;

  const customers = await prisma.customer.findMany({
    where: {
      storeId: store.id,
      lastVisitAt: { not: null, gte: addDays(now, -180) },
      // 今後のアクティブな予約がない
      reservations: {
        none: { startAt: { gt: now }, status: { in: ["PENDING", "CONFIRMED"] } },
      },
    },
  });

  for (const customer of customers) {
    const lastVisitAt = customer.lastVisitAt;
    if (!lastVisitAt) continue;

    // 同一来店サイクル内の重複送信防止
    const alreadySent = await prisma.messageLog.findFirst({
      where: {
        customerId: customer.id, kind: "REBOOKING", sentAt: { gt: lastVisitAt },
      },
      select: { id: true },
    });
    if (alreadySent) continue;

    // 最後に受けたメニューの推奨間隔を取得
    const lastCompleted = await prisma.reservation.findFirst({
      where: { customerId: customer.id, status: "COMPLETED" },
      orderBy: { startAt: "desc" },
      include: { service: true },
    });
    const intervalDays =
      lastCompleted?.service?.repeatIntervalDays ?? store.defaultRebookingIntervalDays;
    const dueAt = addDays(lastVisitAt, intervalDays);
    if (dueAt > now) continue;

    const log = await sendAutomationMessage({
      store, customer, kind: "REBOOKING", setting, now,
    });
    tally(counts, log);
  }
  return counts;
}
