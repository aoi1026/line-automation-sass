import type {
  CampaignStatus,
  DiscountType,
  MessageChannel,
  MessageKind,
  MessageStatus,
  ReservationSource,
  ReservationStatus,
} from "@prisma/client";
import type { DayKey } from "@/lib/jst";

export const APP_NAME = "リピナビ";
export const APP_TAGLINE = "LINEで、リピーターを自動で育てる。";

// ========== メッセージ種別 ==========

export const MESSAGE_KIND_LABELS: Record<MessageKind, string> = {
  BOOKING_CONFIRMATION: "予約確認",
  REMINDER: "リマインダー",
  CANCELLATION: "キャンセル通知",
  RESCHEDULE: "日時変更通知",
  THANKS: "来店お礼",
  REBOOKING: "再来店リマインド",
  BIRTHDAY: "誕生日メッセージ",
  CAMPAIGN: "キャンペーン",
  MANUAL: "手動送信",
};

/** 自動配信設定の対象となる種別（画面表示順） */
export const AUTOMATION_KINDS: MessageKind[] = [
  "BOOKING_CONFIRMATION",
  "REMINDER",
  "CANCELLATION",
  "RESCHEDULE",
  "THANKS",
  "REBOOKING",
  "BIRTHDAY",
];

export const AUTOMATION_DESCRIPTIONS: Record<string, string> = {
  BOOKING_CONFIRMATION: "予約が登録・確定された直後に、予約内容の確認メッセージを自動送信します。",
  REMINDER: "予約日時の前に、リマインドメッセージを自動送信します（例: 前日）。",
  CANCELLATION: "予約がキャンセルされた際に、お知らせメッセージを自動送信します。",
  RESCHEDULE: "予約の日時が変更された際に、新しい日時のお知らせを自動送信します。",
  THANKS: "ご来店（来店済み処理）の後に、お礼メッセージを自動送信します。アンケートやクーポンの同時送付も可能です。",
  REBOOKING: "前回来店からメニューごとの推奨間隔が経過したお客様に、再来店のご案内を自動送信します。",
  BIRTHDAY: "お誕生日当日に、お祝いメッセージを自動送信します。クーポンの同時送付も可能です。",
};

/** タイミング設定を持つ種別 */
export const KINDS_WITH_OFFSET: MessageKind[] = ["REMINDER", "THANKS"];
/** 送信時刻(JST)設定を持つ種別 */
export const KINDS_WITH_SEND_HOUR: MessageKind[] = ["REBOOKING", "BIRTHDAY"];

// ========== 予約 ==========

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: "未確定",
  CONFIRMED: "確定",
  COMPLETED: "来店済み",
  CANCELLED: "キャンセル",
  NO_SHOW: "無断キャンセル",
};

/** Badge等で使うステータス色（Tailwindクラス） */
export const RESERVATION_STATUS_COLORS: Record<ReservationStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-sky-100 text-sky-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-gray-200 text-gray-600",
  NO_SHOW: "bg-red-100 text-red-700",
};

export const RESERVATION_SOURCE_LABELS: Record<ReservationSource, string> = {
  MANUAL: "店舗登録",
  WEB: "Web予約",
  LINE: "LINE",
};

// ========== メッセージログ ==========

export const MESSAGE_CHANNEL_LABELS: Record<MessageChannel, string> = {
  LINE: "LINE",
  DEMO: "デモ",
};

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  SENT: "送信済み",
  FAILED: "失敗",
  SKIPPED: "スキップ",
};

export const MESSAGE_STATUS_COLORS: Record<MessageStatus, string> = {
  SENT: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-700",
  SKIPPED: "bg-gray-200 text-gray-600",
};

// ========== キャンペーン ==========

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "下書き",
  SCHEDULED: "配信予約済み",
  SENDING: "配信中",
  SENT: "配信完了",
  CANCELLED: "中止",
};

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  DRAFT: "bg-gray-200 text-gray-600",
  SCHEDULED: "bg-amber-100 text-amber-800",
  SENDING: "bg-sky-100 text-sky-800",
  SENT: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-red-100 text-red-700",
};

// ========== クーポン ==========

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  PERCENT: "％割引",
  AMOUNT: "金額割引",
};

// ========== 性別 ==========

export const GENDER_LABELS: Record<string, string> = {
  female: "女性",
  male: "男性",
  other: "その他",
  "": "未設定",
};

// ========== 営業時間 ==========

export type BusinessHoursDay = { open: string; close: string; closed: boolean };
export type BusinessHours = Record<DayKey, BusinessHoursDay>;

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  mon: { open: "10:00", close: "19:00", closed: false },
  tue: { open: "10:00", close: "19:00", closed: false },
  wed: { open: "10:00", close: "19:00", closed: false },
  thu: { open: "10:00", close: "19:00", closed: false },
  fri: { open: "10:00", close: "19:00", closed: false },
  sat: { open: "09:00", close: "18:00", closed: false },
  sun: { open: "09:00", close: "18:00", closed: true },
};

// ========== テンプレートのプレースホルダー ==========

export const TEMPLATE_PLACEHOLDERS: { key: string; description: string }[] = [
  { key: "お客様名", description: "顧客の氏名" },
  { key: "店舗名", description: "店舗の名前" },
  { key: "予約日時", description: "予約の日時（例: 2026年8月26日(水) 14:30）" },
  { key: "メニュー名", description: "予約メニュー名" },
  { key: "担当者名", description: "担当スタッフ名" },
  { key: "前回来店日", description: "顧客の最終来店日" },
  { key: "経過日数", description: "最終来店からの経過日数" },
  { key: "クーポンリンク", description: "クーポン表示ページのURL（クーポン設定時）" },
  { key: "アンケートリンク", description: "アンケート回答ページのURL（アンケート設定時）" },
  { key: "予約リンク", description: "Web予約ページのURL" },
  { key: "予約確認リンク", description: "予約の確認・キャンセルページのURL" },
];

// ========== デフォルトのメッセージテンプレート（店舗作成時に投入） ==========

export const DEFAULT_TEMPLATES: { kind: MessageKind; name: string; content: string }[] = [
  {
    kind: "BOOKING_CONFIRMATION",
    name: "予約確認（標準）",
    content:
      "{お客様名}様\n\nご予約ありがとうございます。以下の内容で承りました。\n\n■ 日時：{予約日時}\n■ メニュー：{メニュー名}\n■ 担当：{担当者名}\n\nご予約の確認・キャンセルはこちら\n{予約確認リンク}\n\nご来店を心よりお待ちしております。\n{店舗名}",
  },
  {
    kind: "REMINDER",
    name: "前日リマインダー（標準）",
    content:
      "{お客様名}様\n\nご予約日時が近づいてまいりましたのでお知らせいたします。\n\n■ 日時：{予約日時}\n■ メニュー：{メニュー名}\n■ 担当：{担当者名}\n\nご都合が悪くなられた場合は、お手数ですがこちらからご連絡ください。\n{予約確認リンク}\n\nお会いできるのを楽しみにしております。\n{店舗名}",
  },
  {
    kind: "CANCELLATION",
    name: "キャンセル通知（標準）",
    content:
      "{お客様名}様\n\n以下のご予約のキャンセルを承りました。\n\n■ 日時：{予約日時}\n■ メニュー：{メニュー名}\n\nまたのご利用を心よりお待ちしております。\nご予約はこちらから\n{予約リンク}\n\n{店舗名}",
  },
  {
    kind: "RESCHEDULE",
    name: "日時変更通知（標準）",
    content:
      "{お客様名}様\n\nご予約の日時変更を承りました。新しいご予約内容は以下のとおりです。\n\n■ 日時：{予約日時}\n■ メニュー：{メニュー名}\n■ 担当：{担当者名}\n\nご予約の確認はこちら\n{予約確認リンク}\n\nご来店を心よりお待ちしております。\n{店舗名}",
  },
  {
    kind: "THANKS",
    name: "来店お礼（標準）",
    content:
      "{お客様名}様\n\n本日はご来店いただき、誠にありがとうございました。\n仕上がりはいかがでしょうか？\n\n{{#アンケートリンク}}よろしければ、今後のサービス向上のためアンケートにご協力ください。\n{アンケートリンク}\n{{/アンケートリンク}}\n{{#クーポンリンク}}次回ご利用いただけるクーポンをお贈りいたします。\n{クーポンリンク}\n{{/クーポンリンク}}\nまたのご来店を心よりお待ちしております。\n{店舗名}",
  },
  {
    kind: "REBOOKING",
    name: "再来店リマインド（標準）",
    content:
      "{お客様名}様\n\nいつもご利用ありがとうございます。{店舗名}です。\n\n前回のご来店（{前回来店日}）から{経過日数}日が経ちました。\nそろそろ次回のご来店時期です。\n\n{{#クーポンリンク}}ご来店をお待ちしております。こちらのクーポンをぜひご利用ください。\n{クーポンリンク}\n\n{{/クーポンリンク}}ご予約はこちらから簡単にお取りいただけます。\n{予約リンク}\n\nお会いできるのを楽しみにしております。",
  },
  {
    kind: "BIRTHDAY",
    name: "誕生日メッセージ（標準）",
    content:
      "{お客様名}様\n\nお誕生日おめでとうございます！🎂\n{店舗名}スタッフ一同、心よりお祝い申し上げます。\n\n{{#クーポンリンク}}日頃の感謝を込めて、バースデークーポンをお贈りいたします。\n{クーポンリンク}\n\n{{/クーポンリンク}}素敵な一年になりますように。\nまたのご来店をお待ちしております。",
  },
];
