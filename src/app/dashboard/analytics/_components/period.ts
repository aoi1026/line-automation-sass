/**
 * 期間切替の定数。
 * サーバーコンポーネント（page.tsx）とクライアントコンポーネント（period-tabs.tsx）の
 * 双方から参照するため、"use client" を持たないモジュールに置く。
 * （"use client" モジュールの非コンポーネント export をサーバー側で参照すると
 *   クライアント参照プロキシとなり値を読み出せない）
 */
export const PERIOD_DAYS = [30, 90, 365] as const;
export type PeriodDays = (typeof PERIOD_DAYS)[number];

export const PERIOD_LABELS: Record<PeriodDays, string> = {
  30: "直近30日",
  90: "直近90日",
  365: "直近1年",
};
