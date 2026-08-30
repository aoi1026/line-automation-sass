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
 *
 * 毎分実行されるため、判定に必要な送信履歴・直近の来店メニューは
 * 顧客ごとに問い合わせず、対象顧客ぶんをまとめて取得してメモリ上で突き合わせる。
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
  if (customers.length === 0) return counts;

  const customerIds = customers.map((c) => c.id);

  // 対象顧客の中で最も古い最終来店日時。これより前の送信履歴は誰の判定にも影響しない。
  let oldestLastVisitMs = now.getTime();
  for (const customer of customers) {
    const t = customer.lastVisitAt?.getTime();
    if (t !== undefined && t < oldestLastVisitMs) oldestLastVisitMs = t;
  }

  const [sentGroups, lastCompletedReservations] = await Promise.all([
    // 顧客ごとの「最後に再来店リマインドを送った日時」
    prisma.messageLog.groupBy({
      by: ["customerId"],
      where: {
        storeId: store.id,
        customerId: { in: customerIds },
        kind: "REBOOKING",
        sentAt: { gt: new Date(oldestLastVisitMs) },
      },
      _max: { sentAt: true },
    }),
    // 顧客ごとの「最後に受けたメニュー」の推奨再来店間隔
    prisma.reservation.findMany({
      where: { storeId: store.id, customerId: { in: customerIds }, status: "COMPLETED" },
      orderBy: [{ customerId: "asc" }, { startAt: "desc" }],
      distinct: ["customerId"],
      select: { customerId: true, service: { select: { repeatIntervalDays: true } } },
    }),
  ]);

  const lastSentAtByCustomer = new Map<string, Date>();
  for (const group of sentGroups) {
    const sentAt = group._max.sentAt;
    if (group.customerId && sentAt) lastSentAtByCustomer.set(group.customerId, sentAt);
  }

  const intervalByCustomer = new Map<string, number | null>();
  for (const reservation of lastCompletedReservations) {
    intervalByCustomer.set(reservation.customerId, reservation.service?.repeatIntervalDays ?? null);
  }

  for (const customer of customers) {
    const lastVisitAt = customer.lastVisitAt;
    if (!lastVisitAt) continue;

    // 同一来店サイクル内の重複送信防止
    const lastSentAt = lastSentAtByCustomer.get(customer.id);
    if (lastSentAt && lastSentAt > lastVisitAt) continue;

    const intervalDays =
      intervalByCustomer.get(customer.id) ?? store.defaultRebookingIntervalDays;
    const dueAt = addDays(lastVisitAt, intervalDays);
    if (dueAt > now) continue;

    const log = await sendAutomationMessage({
      store, customer, kind: "REBOOKING", setting, now,
    });
    tally(counts, log);
  }
  return counts;
}
