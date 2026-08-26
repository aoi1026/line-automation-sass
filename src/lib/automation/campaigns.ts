import type { Store } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deliverMessage } from "@/lib/messaging";
import { parseRules, resolveTargets } from "@/lib/segments";
import { buildCustomerVars, renderTemplate } from "@/lib/templates";
import { getAppUrl } from "@/lib/utils";
import type { KindCounts } from "./types";
import { emptyCounts, tally } from "./types";

/**
 * キャンペーン配信:
 * 配信予定時刻を過ぎた SCHEDULED のキャンペーンを配信する。
 * セグメント（または保存済みのインライン条件）で対象顧客を抽出し、
 * 1人ずつパーソナライズして送信。クーポン設定時は顧客ごとに発行する。
 */
export async function runCampaigns(store: Store, now: Date): Promise<KindCounts> {
  const counts = emptyCounts();

  const dueCampaigns = await prisma.campaign.findMany({
    where: {
      storeId: store.id,
      status: "SCHEDULED",
      scheduledAt: { not: null, lte: now },
    },
    include: { segment: true, coupon: true },
  });

  for (const campaign of dueCampaigns) {
    // 二重配信防止: SENDINGへ遷移できたプロセスだけが配信する
    const claimed = await prisma.campaign.updateMany({
      where: { id: campaign.id, status: "SCHEDULED" },
      data: { status: "SENDING" },
    });
    if (claimed.count === 0) continue;

    const rules = parseRules(campaign.segment?.rules ?? campaign.filters ?? {});
    const targets = await resolveTargets(store.id, rules, now);

    let sentCount = 0;
    for (const customer of targets) {
      const vars = buildCustomerVars(store, customer, now);

      if (campaign.coupon && campaign.coupon.active && customer.lineUserId) {
        const issue = await prisma.couponIssue.create({
          data: { couponId: campaign.coupon.id, customerId: customer.id },
        });
        vars["クーポンリンク"] = `${getAppUrl()}/c/${issue.token}`;
      }

      const log = await deliverMessage({
        store, customer, kind: "CAMPAIGN",
        content: renderTemplate(campaign.content, vars),
        campaignId: campaign.id,
      });
      tally(counts, log);
      if (log.status === "SENT") sentCount++;
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: "SENT", sentAt: now,
        targetCount: targets.length, sentCount,
      },
    });
  }
  return counts;
}
