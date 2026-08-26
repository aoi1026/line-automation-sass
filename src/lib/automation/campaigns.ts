import type { Customer, Store } from "@prisma/client";
import { prisma } from "@/lib/db";
import { deliverMessage } from "@/lib/messaging";
import { notify } from "@/lib/notifications";
import { parseRules, resolveTargets } from "@/lib/segments";
import { buildCustomerVars, renderTemplate } from "@/lib/templates";
import { formatNumber, getAppUrl } from "@/lib/utils";
import type { KindCounts } from "./types";
import { emptyCounts, tally } from "./types";

/**
 * キャンペーン配信:
 * 配信予定時刻を過ぎた SCHEDULED のキャンペーンを配信する。
 * セグメント（または保存済みのインライン条件）で対象顧客を抽出し、
 * 1人ずつパーソナライズして送信。クーポン設定時は顧客ごとに発行する。
 *
 * 送信中に例外が発生した場合、SENDINGのまま放置すると
 * （claimのガードはSCHEDULEDにしかマッチしないため）二度と拾われず配信不能になる。
 * そのためエラー時は SCHEDULED へ戻して次回の実行で再試行させる。
 * 再試行時は、既にMessageLogが記録済みの顧客（前回送信済み）を除外することで、
 * deliverMessage自体には冪等性がなくても二重送信・クーポン重複発行を防ぐ。
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

    // resolveTargets前に例外が発生した場合はnullのまま（=対象数不明）にしておき、
    // catch内でtargetCountを不用意に0で上書きしないようにする
    let targets: Customer[] | null = null;

    try {
      const rules = parseRules(campaign.segment?.rules ?? campaign.filters ?? {});
      const resolvedTargets = await resolveTargets(store.id, rules, now);
      targets = resolvedTargets;

      // 前回の送信で既にMessageLogが記録済みの顧客は再送しない（リトライ時の重複送信防止）
      const alreadyLogged = await prisma.messageLog.findMany({
        where: { campaignId: campaign.id, kind: "CAMPAIGN" },
        select: { customerId: true },
      });
      const alreadySentIds = new Set(
        alreadyLogged.map((l) => l.customerId).filter((id): id is string => !!id)
      );

      // クーポンの有効期間・発行上限は配信前に一度だけ判定し、残り発行枠を数えながら発行する
      const coupon = campaign.coupon;
      const couponWithinPeriod =
        !!coupon &&
        (!coupon.validFrom || coupon.validFrom <= now) &&
        (!coupon.validUntil || coupon.validUntil >= now);
      let couponRemaining = Infinity;
      if (coupon && couponWithinPeriod && coupon.usageLimit != null) {
        const issued = await prisma.couponIssue.count({ where: { couponId: coupon.id } });
        couponRemaining = Math.max(0, coupon.usageLimit - issued);
      }

      for (const customer of resolvedTargets) {
        if (alreadySentIds.has(customer.id)) continue;

        const vars = buildCustomerVars(store, customer, now);

        if (
          coupon &&
          coupon.active &&
          couponWithinPeriod &&
          couponRemaining > 0 &&
          customer.lineUserId
        ) {
          const issue = await prisma.couponIssue.create({
            data: { couponId: coupon.id, customerId: customer.id },
          });
          couponRemaining--;
          vars["クーポンリンク"] = `${getAppUrl()}/c/${issue.token}`;
        }

        const log = await deliverMessage({
          store, customer, kind: "CAMPAIGN",
          content: renderTemplate(campaign.content, vars),
          campaignId: campaign.id,
        });
        tally(counts, log);
      }

      // sentCountはMessageLogから実際のSENT件数を数え直す（リトライを跨いだ累計を正しく反映するため）
      const sentCount = await prisma.messageLog.count({
        where: { campaignId: campaign.id, kind: "CAMPAIGN", status: "SENT" },
      });
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          status: "SENT", sentAt: now,
          targetCount: resolvedTargets.length, sentCount,
        },
      });

      // 店舗スタッフ向けの通知（予約配信は無人で完了するため結果を知らせる）。
      // notify() は内部で例外を握りつぶすため、配信処理を妨げることはない
      await notify({
        storeId: store.id,
        type: "CAMPAIGN_SENT",
        title: `「${campaign.title}」の配信完了`,
        body: `対象${formatNumber(resolvedTargets.length)}件のうち${formatNumber(sentCount)}件に配信しました。`,
        link: `/dashboard/campaigns/${campaign.id}`,
      });
    } catch (e) {
      console.error(`[automation] キャンペーン「${campaign.title}」の配信でエラー:`, e);

      // SENDINGのまま止まると次回以降のrunCampaignsに二度と拾われないため、SCHEDULEDへ戻して再試行させる
      // （scheduledAtはそのまま維持）。ここまでに実際に送信できた分はsentCount/targetCountへ反映する。
      const sentCount = await prisma.messageLog.count({
        where: { campaignId: campaign.id, kind: "CAMPAIGN", status: "SENT" },
      });
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          status: "SCHEDULED",
          targetCount: targets ? targets.length : campaign.targetCount,
          sentCount,
        },
      });

      // 1件の失敗で他の配信予定キャンペーンの処理が止まらないよう、次のキャンペーンへ進む
      continue;
    }
  }
  return counts;
}
