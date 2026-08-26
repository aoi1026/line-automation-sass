import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 金額を「¥12,300」形式にフォーマット */
export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

/** 数値を「1,234」形式にフォーマット */
export function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP");
}

/** パーセント表示（小数1桁） */
export function formatPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** 6桁のランダムな数字コードを生成（LINE連携コード用） */
export function generateLinkCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** URLセーフなランダムスラッグを生成 */
export function generateSlug(len = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function getAppUrl(): string {
  return process.env.APP_URL || "http://localhost:3000";
}
