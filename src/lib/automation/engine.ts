import { prisma } from "@/lib/db";
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
    }
  }
  return summary;
}
