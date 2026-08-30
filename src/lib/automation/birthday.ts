import { Prisma } from "@prisma/client";
import type { Store } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, getJstHour, isJstBirthdayToday, jstParts } from "@/lib/jst";
import { loadSetting, sendAutomationMessage } from "@/lib/messaging";
import type { KindCounts } from "./types";
import { emptyCounts, tally } from "./types";

/**
 * 誕生日の候補となる月日（"MM-DD"）を、JSTの今日を中心に前日・当日・翌日で返す。
 *
 * DBの birthday はUTCの timestamp で保存されているため、JSTで同じ日付でも
 * UTC上では前日の15:00以降になる。逆方向のずれも起こりうるため前後1日を候補に含め、
 * 最終的な判定は isJstBirthdayToday（JST基準）で行う。
 * 2月29日生まれを取りこぼさないよう、月日の加減算は閏年（2000年）上で行う。
 */
export function birthdayCandidateMonthDays(now: Date): string[] {
  const { month, day } = jstParts(now);
  const baseMs = Date.UTC(2000, month - 1, day);
  return [-1, 0, 1].map((offsetDays) => {
    const d = new Date(baseMs + offsetDays * 86400000);
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${mm}-${dd}`;
  });
}

/**
 * 誕生日メッセージ自動配信:
 * JSTで誕生日当日の顧客にお祝いメッセージを送信する（年1回まで）。
 * 設定された送信時刻（JST）以降の実行時のみ送信。
 *
 * 毎分実行されるため、全顧客を読み込まずに「誕生日が今日前後の顧客」だけをDB側で絞り込む。
 * 送信済み判定も対象ぶんをまとめて取得する。
 */
export async function runBirthday(store: Store, now: Date): Promise<KindCounts> {
  const counts = emptyCounts();
  const setting = await loadSetting(store.id, "BIRTHDAY");
  if (!setting?.enabled) return counts;
  if (getJstHour(now) < setting.sendHourJst) return counts;

  // 月日での絞り込みはPrismaのwhereで表現できないため、候補のIDだけをSQLで取得する
  const monthDays = birthdayCandidateMonthDays(now);
  const candidates = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "Customer"
    WHERE "storeId" = ${store.id}
      AND "birthday" IS NOT NULL
      AND to_char("birthday", 'MM-DD') IN (${Prisma.join(monthDays)})
  `;
  if (candidates.length === 0) return counts;

  const customers = await prisma.customer.findMany({
    where: { storeId: store.id, id: { in: candidates.map((row) => row.id) } },
  });
  const targets = customers.filter(
    (customer) => customer.birthday && isJstBirthdayToday(customer.birthday, now)
  );
  if (targets.length === 0) return counts;

  // 年1回のみ（過去300日以内に誕生日メッセージ送信済みならスキップ）
  const sentLogs = await prisma.messageLog.findMany({
    where: {
      storeId: store.id,
      customerId: { in: targets.map((customer) => customer.id) },
      kind: "BIRTHDAY",
      sentAt: { gte: addDays(now, -300) },
    },
    select: { customerId: true },
    distinct: ["customerId"],
  });
  const alreadySentIds = new Set(
    sentLogs.map((log) => log.customerId).filter((id): id is string => id !== null)
  );

  for (const customer of targets) {
    if (alreadySentIds.has(customer.id)) continue;

    const log = await sendAutomationMessage({
      store, customer, kind: "BIRTHDAY", setting, now,
    });
    tally(counts, log);
  }
  return counts;
}
