import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  NEW_WEB_RESERVATION: "Web予約",
  RESERVATION_CANCELLED: "キャンセル",
  LOW_RATING_SURVEY: "低評価の回答",
  CAMPAIGN_SENT: "キャンペーン配信",
  AUTOMATION_FAILED: "自動配信の失敗",
};

/** 通知タイプごとの表示色（Tailwindクラス） */
export const NOTIFICATION_TYPE_COLORS: Record<NotificationType, string> = {
  NEW_WEB_RESERVATION: "bg-sky-100 text-sky-800",
  RESERVATION_CANCELLED: "bg-amber-100 text-amber-800",
  LOW_RATING_SURVEY: "bg-red-100 text-red-700",
  CAMPAIGN_SENT: "bg-emerald-100 text-emerald-800",
  AUTOMATION_FAILED: "bg-red-100 text-red-700",
};

/**
 * 店舗向けの通知を作成する。
 * 通知の失敗が本処理を止めないよう、例外は握りつぶしてログに残す。
 */
export async function notify(params: {
  storeId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        storeId: params.storeId,
        type: params.type,
        title: params.title,
        body: params.body ?? "",
        link: params.link ?? "",
      },
    });
  } catch (e) {
    console.error("[notifications] 通知の作成に失敗しました:", e);
  }
}

/** 未読件数 */
export async function countUnread(storeId: string): Promise<number> {
  return prisma.notification.count({ where: { storeId, readAt: null } });
}
