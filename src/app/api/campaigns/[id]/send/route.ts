import { NextResponse } from "next/server";
import { getApiSession, jsonError, notFound, unauthorized } from "@/lib/api";
import { runCampaigns } from "@/lib/automation/campaigns";
import { prisma } from "@/lib/db";

/**
 * 今すぐ配信。
 * 下書き・配信予約中のキャンペーンを現在時刻の配信予約に変更し、その場で配信処理を実行する。
 * runCampaigns は SCHEDULED を SENDING に遷移できたプロセスのみ配信するため二重配信されない。
 *
 * 対象を campaignId で絞り込み、このリクエストでは指定されたキャンペーンだけを配信する
 * （他の配信予定キャンペーンまで巻き込むと、そのぶんリクエストが長くなるため）。
 * 対象人数が多く途中でリクエストが打ち切られても、SENDING のまま止まったキャンペーンは
 * 次回以降の自動配信の実行時に配信予約へ戻され、送信済みの顧客を除いて続きから再開される。
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!campaign) return notFound("キャンペーンが見つかりませんでした");
  if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
    return jsonError("下書きまたは配信予約中のキャンペーンのみ配信できます");
  }

  const store = await prisma.store.findUnique({ where: { id: session.storeId } });
  if (!store) return notFound("店舗が見つかりませんでした");

  const now = new Date();
  await prisma.campaign.updateMany({
    where: { id: campaign.id, storeId: session.storeId, status: { in: ["DRAFT", "SCHEDULED"] } },
    data: { status: "SCHEDULED", scheduledAt: now },
  });

  const counts = await runCampaigns(store, now, { campaignId: campaign.id });

  const updated = await prisma.campaign.findFirst({
    where: { id: campaign.id, storeId: session.storeId },
  });
  return NextResponse.json({
    ok: true,
    sent: counts.sent,
    skipped: counts.skipped,
    failed: counts.failed,
    targetCount: updated?.targetCount ?? 0,
    sentCount: updated?.sentCount ?? 0,
  });
}
