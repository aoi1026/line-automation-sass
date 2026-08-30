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
 * SENDING のまま止まったキャンペーンを「配信が中断された」とみなすまでの経過時間（ミリ秒）。
 * HTTPリクエスト内で配信中にプロセスが落ちる・タイムアウトで打ち切られると、
 * ステータスが SENDING のまま残り、SCHEDULED しか拾わない claim に二度と引っかからなくなる。
 */
export const CAMPAIGN_STALL_MS = 15 * 60 * 1000;

/**
 * 同一キャンペーン・同一顧客あたりの送信試行回数の上限。
 * 一時的な送信失敗は次回以降に再送するが、恒久的な失敗で毎回送信を試み続けないよう
 * 失敗ログの件数で打ち切る。
 */
export const CAMPAIGN_MAX_ATTEMPTS = 3;

/**
 * 中断されたまま SENDING で止まっているキャンペーンを SCHEDULED へ戻す。
 * 戻したキャンペーンは同じ実行の中で改めて claim され、続きから配信される。
 * 既に送信済み（SENT / SKIPPED のログがある）の顧客は除外されるため二重送信にはならない。
 */
async function recoverStalledCampaigns(
  storeId: string,
  now: Date,
  campaignId?: string
): Promise<void> {
  const stalledBefore = new Date(now.getTime() - CAMPAIGN_STALL_MS);

  const stalled = await prisma.campaign.findMany({
    where: {
      storeId,
      ...(campaignId ? { id: campaignId } : {}),
      status: "SENDING",
      // 配信中はキャンペーン行を更新しないため、updatedAt は SENDING へ遷移した時刻のまま
      updatedAt: { lte: stalledBefore },
    },
    select: { id: true, title: true, scheduledAt: true },
  });

  for (const campaign of stalled) {
    // 別プロセスが直前に配信を再開していた場合に横取りしないよう、条件付きで戻す
    const restored = await prisma.campaign.updateMany({
      where: {
        id: campaign.id,
        storeId,
        status: "SENDING",
        updatedAt: { lte: stalledBefore },
      },
      // scheduledAt が空だと配信対象の抽出条件（scheduledAt <= now）に合致しないため補う
      data: { status: "SCHEDULED", scheduledAt: campaign.scheduledAt ?? now },
    });
    if (restored.count > 0) {
      console.warn(
        `[automation] 中断されたキャンペーン「${campaign.title}」を配信予約に戻し、続きから再開します`
      );
    }
  }
}

/**
 * キャンペーン配信:
 * 配信予定時刻を過ぎた SCHEDULED のキャンペーンを配信する。
 * セグメント（または保存済みのインライン条件）で対象顧客を抽出し、
 * 1人ずつパーソナライズして送信。クーポン設定時は顧客ごとに発行する。
 *
 * 送信中に例外が発生した場合、SENDINGのまま放置すると
 * （claimのガードはSCHEDULEDにしかマッチしないため）二度と拾われず配信不能になる。
 * そのためエラー時は SCHEDULED へ戻して次回の実行で再試行させる。
 * 例外を捕捉できないケース（プロセスの強制終了・リクエストのタイムアウト）に備えて、
 * 実行のたびに CAMPAIGN_STALL_MS 以上 SENDING のまま止まっているものも SCHEDULED へ戻す。
 * 再試行時は、既に送信できた顧客（SENT / SKIPPED のログがある顧客）を除外することで、
 * deliverMessage自体には冪等性がなくても二重送信・クーポン重複発行を防ぐ。
 *
 * opts.campaignId を指定すると、そのキャンペーンだけを対象に処理する
 * （管理画面の「今すぐ配信」で、無関係なキャンペーンの配信までリクエスト内で抱え込まないため）。
 */
export async function runCampaigns(
  store: Store,
  now: Date,
  opts?: { campaignId?: string }
): Promise<KindCounts> {
  const counts = emptyCounts();

  await recoverStalledCampaigns(store.id, now, opts?.campaignId);

  const dueCampaigns = await prisma.campaign.findMany({
    where: {
      storeId: store.id,
      ...(opts?.campaignId ? { id: opts.campaignId } : {}),
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

      // 前回までの送信結果を顧客ごとに集計する。
      // - SENT / SKIPPED: 送信済み。再送しない
      // - FAILED のみ: 一時的な失敗とみなし、上限回数まで再送する
      const previousLogs = await prisma.messageLog.findMany({
        where: { storeId: store.id, campaignId: campaign.id, kind: "CAMPAIGN" },
        select: { customerId: true, status: true },
      });
      const alreadySentIds = new Set<string>();
      const failedCountByCustomer = new Map<string, number>();
      for (const log of previousLogs) {
        if (!log.customerId) continue;
        if (log.status === "FAILED") {
          failedCountByCustomer.set(
            log.customerId,
            (failedCountByCustomer.get(log.customerId) ?? 0) + 1
          );
        } else {
          alreadySentIds.add(log.customerId);
        }
      }

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
        const failedCount = failedCountByCustomer.get(customer.id) ?? 0;
        if (failedCount >= CAMPAIGN_MAX_ATTEMPTS) continue;

        const vars = buildCustomerVars(store, customer, now);

        if (
          coupon &&
          coupon.active &&
          couponWithinPeriod &&
          customer.lineUserId
        ) {
          // 再送の場合、前回の送信でクーポンは発行済み。未使用の発行分があれば再利用して
          // 二重発行を防ぐ。
          // 注: CouponIssue はキャンペーンと紐付かない（スキーマ変更は本担当の範囲外）ため、
          // 同じクーポンを配った別のキャンペーンの未使用分を再利用する可能性がある。
          // 内容が同一のクーポンなのでお客様への実害はなく、発行数が増えないぶん安全側に倒している。
          const reusable =
            failedCount > 0
              ? await prisma.couponIssue.findFirst({
                  where: { couponId: coupon.id, customerId: customer.id, usedAt: null },
                  orderBy: { issuedAt: "desc" },
                  select: { token: true },
                })
              : null;

          if (reusable) {
            vars["クーポンリンク"] = `${getAppUrl()}/c/${reusable.token}`;
          } else if (couponRemaining > 0) {
            const issue = await prisma.couponIssue.create({
              data: { couponId: coupon.id, customerId: customer.id },
            });
            couponRemaining--;
            vars["クーポンリンク"] = `${getAppUrl()}/c/${issue.token}`;
          }
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
        where: { storeId: store.id, campaignId: campaign.id, kind: "CAMPAIGN", status: "SENT" },
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
        where: { storeId: store.id, campaignId: campaign.id, kind: "CAMPAIGN", status: "SENT" },
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
