import { prisma } from "@/lib/db";
import { notify } from "@/lib/notifications";
import { runBirthday } from "./birthday";
import { runCampaigns } from "./campaigns";
import { runRebooking } from "./rebooking";
import { runReminders } from "./reminders";
import { runThanks } from "./thanks";
import type { KindCounts } from "./types";
import { emptyCounts, mergeCounts } from "./types";

export type AutomationSummary = {
  ranAt: string;
  storeCount: number;
  results: {
    reminder: KindCounts;
    thanks: KindCounts;
    rebooking: KindCounts;
    birthday: KindCounts;
    campaign: KindCounts;
  };
  errors: string[];
};

/**
 * 自動配信エンジン本体。
 * 全店舗（storeId指定時はその店舗のみ）について、
 * リマインダー / 来店お礼 / 再来店リマインド / 誕生日 / キャンペーン配信 を実行する。
 * 冪等: 送信済み判定はMessageLogに基づくため、何度実行しても重複送信しない。
 */
export async function runAutomations(opts?: {
  storeId?: string;
  now?: Date;
}): Promise<AutomationSummary> {
  const now = opts?.now ?? new Date();
  const summary: AutomationSummary = {
    ranAt: now.toISOString(),
    storeCount: 0,
    results: {
      reminder: emptyCounts(),
      thanks: emptyCounts(),
      rebooking: emptyCounts(),
      birthday: emptyCounts(),
      campaign: emptyCounts(),
    },
    errors: [],
  };

  const stores = await prisma.store.findMany({
    where: opts?.storeId ? { id: opts.storeId } : undefined,
  });
  summary.storeCount = stores.length;

  for (const store of stores) {
    try {
      summary.results.reminder = mergeCounts(summary.results.reminder, await runReminders(store, now));
      summary.results.thanks = mergeCounts(summary.results.thanks, await runThanks(store, now));
      summary.results.rebooking = mergeCounts(summary.results.rebooking, await runRebooking(store, now));
      summary.results.birthday = mergeCounts(summary.results.birthday, await runBirthday(store, now));
      summary.results.campaign = mergeCounts(summary.results.campaign, await runCampaigns(store, now));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      summary.errors.push(`店舗 ${store.name}: ${message}`);
      console.error(`[automation] 店舗「${store.name}」の自動配信でエラー:`, e);

      // 店舗スタッフ向けの通知（無人実行のため、失敗に気付けるようにする）。
      //
      // 配信エンジンは毎分実行されるため、恒久的な障害（DB接続不可など）が起きると
      // 同じ通知が毎分積み上がって通知センターが埋まってしまう。
      // 直近1時間に同種の未読通知があれば新規作成しない。
      const recentFailure = await prisma.notification.findFirst({
        where: {
          storeId: store.id,
          type: "AUTOMATION_FAILED",
          createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
        },
        select: { id: true },
      });
      if (!recentFailure) {
        // notify() は内部で例外を握りつぶすため、他店舗の処理を妨げることはない
        await notify({
          storeId: store.id,
          type: "AUTOMATION_FAILED",
          title: "自動配信のエラー",
          body: `自動配信の処理中にエラーが発生しました。${message}`,
          link: "/dashboard/automations",
        });
      }
    }
  }
  return summary;
}
