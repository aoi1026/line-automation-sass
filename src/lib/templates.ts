import type { Customer, Reservation, Service, StaffMember, Store } from "@prisma/client";
import { formatJstDate, formatJstDateTime, jstDaysBetween } from "@/lib/jst";
import { getAppUrl } from "@/lib/utils";

export type TemplateVars = Record<string, string>;

/**
 * テンプレート本文中の {プレースホルダー} を差し込む。
 * 未提供のプレースホルダーは空文字に置換される。
 */
export function renderTemplate(content: string, vars: TemplateVars): string {
  return content.replace(/\{([^{}\n]+)\}/g, (match, key: string) => {
    if (key in vars) return vars[key];
    return "";
  });
}

/** 顧客・店舗の基本変数を構築 */
export function buildCustomerVars(store: Store, customer: Customer, now = new Date()): TemplateVars {
  const vars: TemplateVars = {
    "お客様名": customer.name,
    "店舗名": store.name,
    "予約リンク": `${getAppUrl()}/r/${store.slug}`,
  };
  if (customer.lastVisitAt) {
    vars["前回来店日"] = formatJstDate(customer.lastVisitAt);
    vars["経過日数"] = String(jstDaysBetween(customer.lastVisitAt, now));
  }
  return vars;
}

/** 予約関連の変数を構築（顧客・店舗の変数も含む） */
export function buildReservationVars(
  store: Store,
  customer: Customer,
  reservation: Reservation & { service?: Service | null; staff?: StaffMember | null },
  now = new Date()
): TemplateVars {
  return {
    ...buildCustomerVars(store, customer, now),
    "予約日時": formatJstDateTime(reservation.startAt),
    "メニュー名": reservation.service?.name ?? "ご指定のメニュー",
    "担当者名": reservation.staff?.name ?? "指名なし",
    "予約確認リンク": `${getAppUrl()}/v/${reservation.publicToken}`,
  };
}
