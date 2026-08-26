import type {
  AutomationSetting, Coupon, Customer, MessageKind, MessageLog,
  MessageTemplate, Reservation, Service, StaffMember, Store, Survey,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { pushText } from "@/lib/line/client";
import { DEFAULT_TEMPLATES } from "@/lib/constants";
import {
  buildCustomerVars, buildReservationVars, renderTemplate, type TemplateVars,
} from "@/lib/templates";
import { getAppUrl } from "@/lib/utils";

export type SettingWithRelations = AutomationSetting & {
  template: MessageTemplate | null;
  coupon: Coupon | null;
  survey: Survey | null;
};

export type ReservationWithRelations = Reservation & {
  service: Service | null;
  staff: StaffMember | null;
};

/**
 * メッセージを1件配信し、MessageLogに記録する。
 * - 顧客がLINE未連携: 実送信せず SKIPPED として記録
 * - 店舗のLINEチャネル未設定: 実送信せず DEMO チャネルで SENT として記録（デモモード）
 * - チャネル設定済み: LINE Messaging APIで実送信（成功: SENT / 失敗: FAILED）
 */
export async function deliverMessage(params: {
  store: Store;
  customer: Customer;
  kind: MessageKind;
  content: string;
  reservationId?: string | null;
  campaignId?: string | null;
}): Promise<MessageLog> {
  const { store, customer, kind, content, reservationId, campaignId } = params;

  if (!customer.lineUserId) {
    return prisma.messageLog.create({
      data: {
        storeId: store.id, customerId: customer.id, reservationId: reservationId ?? null,
        campaignId: campaignId ?? null, kind, channel: "DEMO", status: "SKIPPED",
        content, error: "顧客がLINE未連携のため送信をスキップしました",
      },
    });
  }

  const result = await pushText(store, customer.lineUserId, content);
  return prisma.messageLog.create({
    data: {
      storeId: store.id, customerId: customer.id, reservationId: reservationId ?? null,
      campaignId: campaignId ?? null, kind, channel: result.channel,
      status: result.ok ? "SENT" : "FAILED",
      content, error: result.ok ? "" : result.error,
    },
  });
}

export async function loadSetting(storeId: string, kind: MessageKind): Promise<SettingWithRelations | null> {
  return prisma.automationSetting.findUnique({
    where: { storeId_kind: { storeId, kind } },
    include: { template: true, coupon: true, survey: true },
  });
}

/** kindに対応するテンプレート本文を決定（設定テンプレート → 店舗の有効テンプレート → 標準文面） */
export async function resolveTemplateContent(
  storeId: string,
  kind: MessageKind,
  setting?: SettingWithRelations | null
): Promise<string> {
  if (setting?.template?.enabled) return setting.template.content;
  const stored = await prisma.messageTemplate.findFirst({
    where: { storeId, kind, enabled: true },
    orderBy: { createdAt: "asc" },
  });
  if (stored) return stored.content;
  const fallback = DEFAULT_TEMPLATES.find((t) => t.kind === kind);
  return fallback?.content ?? "";
}

/**
 * 自動配信メッセージを1件送信する（設定が無効なら送らず null を返す）。
 * クーポン・アンケートが設定されていれば発行してリンクを差し込む。
 */
export async function sendAutomationMessage(params: {
  store: Store;
  customer: Customer;
  kind: MessageKind;
  reservation?: ReservationWithRelations | null;
  setting?: SettingWithRelations | null;
  now?: Date;
}): Promise<MessageLog | null> {
  const { store, customer, kind, reservation } = params;
  const now = params.now ?? new Date();
  const setting = params.setting !== undefined ? params.setting : await loadSetting(store.id, kind);
  if (!setting || !setting.enabled) return null;

  const content = await resolveTemplateContent(store.id, kind, setting);
  if (!content) return null;

  const vars: TemplateVars = reservation
    ? buildReservationVars(store, customer, reservation, now)
    : buildCustomerVars(store, customer, now);

  // LINE未連携ならクーポン発行等の副作用を起こさずスキップ記録のみ
  if (!customer.lineUserId) {
    return deliverMessage({
      store, customer, kind,
      content: renderTemplate(content, vars),
      reservationId: reservation?.id ?? null,
    });
  }

  if (setting.coupon && setting.coupon.active) {
    const coupon = setting.coupon;
    const issuedCount = await prisma.couponIssue.count({ where: { couponId: coupon.id } });
    const withinLimit = coupon.usageLimit == null || issuedCount < coupon.usageLimit;
    const withinPeriod =
      (!coupon.validFrom || coupon.validFrom <= now) &&
      (!coupon.validUntil || coupon.validUntil >= now);
    if (withinLimit && withinPeriod) {
      const issue = await prisma.couponIssue.create({
        data: { couponId: coupon.id, customerId: customer.id },
      });
      vars["クーポンリンク"] = `${getAppUrl()}/c/${issue.token}`;
    }
  }

  if (setting.survey && setting.survey.active) {
    const request = await prisma.surveyRequest.create({
      data: {
        surveyId: setting.survey.id,
        customerId: customer.id,
        reservationId: reservation?.id ?? null,
      },
    });
    vars["アンケートリンク"] = `${getAppUrl()}/s/${request.token}`;
  }

  return deliverMessage({
    store, customer, kind,
    content: renderTemplate(content, vars),
    reservationId: reservation?.id ?? null,
  });
}

/**
 * 予約イベント（登録確定・キャンセル・日時変更）に応じた通知を送信する。
 * 予約API・Web予約ページから呼び出す。失敗しても呼び出し元の処理は止めない。
 */
export async function notifyReservationEvent(
  reservationId: string,
  kind: Extract<MessageKind, "BOOKING_CONFIRMATION" | "CANCELLATION" | "RESCHEDULE">
): Promise<MessageLog | null> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { store: true, customer: true, service: true, staff: true },
    });
    if (!reservation) return null;
    return await sendAutomationMessage({
      store: reservation.store,
      customer: reservation.customer,
      kind,
      reservation,
    });
  } catch (e) {
    console.error(`[messaging] 予約通知の送信に失敗しました (${kind}):`, e);
    return null;
  }
}
