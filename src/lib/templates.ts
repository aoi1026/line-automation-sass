import type { Customer, Reservation, Service, StaffMember, Store } from "@prisma/client";
import { formatJstDate, formatJstDateTime, jstDaysBetween } from "@/lib/jst";
import { getAppUrl } from "@/lib/utils";

export type TemplateVars = Record<string, string>;

/** 値が実際に使えるか（未設定・空文字は「無い」とみなす） */
function hasValue(vars: TemplateVars, key: string): boolean {
  const v = vars[key];
  return typeof v === "string" && v.trim() !== "";
}

/**
 * テンプレート本文を描画する。
 *
 * 1. 条件ブロック `{{#キー}} … {{/キー}}` は、そのキーに値があるときだけ残す。
 *    クーポンやアンケートは設定されていないことがあり、その場合に
 *    「アンケートにご協力ください」とだけ書かれた本文や、リンクが空欄の
 *    不自然な本文がお客様に届いてしまうため、文ごと出し分けられるようにする。
 * 2. `{プレースホルダー}` を差し込む。未提供のキーは空文字になる。
 * 3. 出し分けで生じた余分な空行を整理する。
 */
export function renderTemplate(content: string, vars: TemplateVars): string {
  const hasBlocks = content.includes("{{#");

  // 1. 条件ブロックの評価
  let out = content.replace(
    /[ \t]*\{\{#([^}\n]+)\}\}[ \t]*\n?([\s\S]*?)[ \t]*\{\{\/\1\}\}[ \t]*\n?/g,
    (_m, key: string, body: string) => (hasValue(vars, key.trim()) ? body : "")
  );

  // 2. プレースホルダーの差し込み
  out = out.replace(/\{([^{}\n]+)\}/g, (_m, key: string) =>
    key in vars ? vars[key] : ""
  );

  // 3. 出し分けを使ったテンプレートのみ、消えたブロックの跡（余分な空行）を整理する。
  //    条件ブロックを使っていない従来の文面は、書かれたとおりの空白を保つ。
  if (!hasBlocks) return out;
  return out.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+$/gm, "").trim();
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
