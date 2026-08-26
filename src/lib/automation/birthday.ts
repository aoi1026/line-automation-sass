import type { Store } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, getJstHour, isJstBirthdayToday } from "@/lib/jst";
import { loadSetting, sendAutomationMessage } from "@/lib/messaging";
import type { KindCounts } from "./types";
import { emptyCounts, tally } from "./types";

/**
 * 誕生日メッセージ自動配信:
 * JSTで誕生日当日の顧客にお祝いメッセージを送信する（年1回まで）。
 * 設定された送信時刻（JST）以降の実行時のみ送信。
 */
export async function runBirthday(store: Store, now: Date): Promise<KindCounts> {
  const counts = emptyCounts();
  const setting = await loadSetting(store.id, "BIRTHDAY");
  if (!setting?.enabled) return counts;
  if (getJstHour(now) < setting.sendHourJst) return counts;

  const customers = await prisma.customer.findMany({
    where: { storeId: store.id, birthday: { not: null } },
  });

  for (const customer of customers) {
    if (!customer.birthday || !isJstBirthdayToday(customer.birthday, now)) continue;

    // 年1回のみ（過去300日以内に誕生日メッセージ送信済みならスキップ）
    const alreadySent = await prisma.messageLog.findFirst({
      where: {
        customerId: customer.id, kind: "BIRTHDAY", sentAt: { gte: addDays(now, -300) },
      },
      select: { id: true },
    });
    if (alreadySent) continue;

    const log = await sendAutomationMessage({
      store, customer, kind: "BIRTHDAY", setting, now,
    });
    tally(counts, log);
  }
  return counts;
}
