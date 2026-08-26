import type { ReservationSource, ReservationStatus } from "@prisma/client";

/** 一覧表示用の予約行データ（サーバーで整形して渡す） */
export type ReservationRow = {
  id: string;
  /** "YYYY-MM-DD"（JST） */
  ymd: string;
  /** "HH:mm"（JST） */
  startTime: string;
  /** "HH:mm"（JST） */
  endTime: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  price: number;
  status: ReservationStatus;
  source: ReservationSource;
  note: string;
};

/** 週間ビューの1日分 */
export type WeekDay = {
  ymd: string;
  /** 「月」等（DAY_LABELS_JA） */
  dayLabel: string;
  /** 「8/26」 */
  dateLabel: string;
  rows: ReservationRow[];
};

/** 作成ダイアログ用の選択肢 */
export type CustomerOption = { id: string; name: string; kana: string };
export type ServiceOption = { id: string; name: string; price: number; durationMin: number };
export type StaffOption = { id: string; name: string };

/** ステータスフィルタの選択肢（ALL = 絞り込みなし） */
export const STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

/** 30分刻みの時刻選択肢（"00:00"〜"23:30"） */
export const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  return `${h}:${m}`;
});
