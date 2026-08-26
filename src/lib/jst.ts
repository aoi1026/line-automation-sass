/**
 * 日本時間（Asia/Tokyo, UTC+9）ユーティリティ。
 * DBにはUTCで保存し、表示・業務ロジック上の「日付」判断はすべてJSTで行う。
 * JSTはDST（夏時間）がないため、+09:00固定オフセットで安全に計算できる。
 */

export const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS_JA: Record<DayKey, string> = {
  mon: "月", tue: "火", wed: "水", thu: "木", fri: "金", sat: "土", sun: "日",
};

/** JSTでの年月日・時分などを分解して取得 */
export function jstParts(date: Date): {
  year: number; month: number; day: number; hour: number; minute: number; weekday: number; // weekday: 0=日 .. 6=土
} {
  const t = new Date(date.getTime() + JST_OFFSET_MS);
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
    weekday: t.getUTCDay(),
  };
}

export function getJstHour(date: Date): number {
  return jstParts(date).hour;
}

/** JSTでの "YYYY-MM-DD" */
export function jstYmd(date: Date): string {
  const { year, month, day } = jstParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** JSTでの "HH:mm" */
export function jstHm(date: Date): string {
  const { hour, minute } = jstParts(date);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" + "HH:mm"（いずれもJST解釈）→ Date */
export function fromJst(ymd: string, hm = "00:00"): Date {
  return new Date(`${ymd}T${hm}:00+09:00`);
}

/** その日のJST 00:00 を返す */
export function jstStartOfDay(date: Date): Date {
  return fromJst(jstYmd(date));
}

/** JSTでの曜日キー（businessHours参照用） */
export function jstDayKey(date: Date): DayKey {
  const w = jstParts(date).weekday; // 0=日
  return (["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as DayKey[])[w];
}

/** 2つの日時がJSTで同じ日か */
export function isSameJstDay(a: Date, b: Date): boolean {
  return jstYmd(a) === jstYmd(b);
}

/** JST基準の経過日数（日付境界ベース）。例: 昨日→1 */
export function jstDaysBetween(from: Date, to: Date): number {
  const a = jstStartOfDay(from).getTime();
  const b = jstStartOfDay(to).getTime();
  return Math.round((b - a) / 86400000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3600000);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"];

/** 「2026年8月26日(水)」 */
export function formatJstDate(date: Date): string {
  const { year, month, day, weekday } = jstParts(date);
  return `${year}年${month}月${day}日(${WEEKDAY_JA[weekday]})`;
}

/** 「8月26日(水)」 */
export function formatJstDateShort(date: Date): string {
  const { month, day, weekday } = jstParts(date);
  return `${month}月${day}日(${WEEKDAY_JA[weekday]})`;
}

/** 「14:30」 */
export function formatJstTime(date: Date): string {
  return jstHm(date);
}

/** 「2026年8月26日(水) 14:30」 */
export function formatJstDateTime(date: Date): string {
  return `${formatJstDate(date)} ${jstHm(date)}`;
}

/** 「8/26 14:30」 */
export function formatJstDateTimeShort(date: Date): string {
  const { month, day } = jstParts(date);
  return `${month}/${day} ${jstHm(date)}`;
}

/** 誕生日がJSTで今日か（年は無視） */
export function isJstBirthdayToday(birthday: Date, now: Date): boolean {
  const b = jstParts(birthday);
  const n = jstParts(now);
  return b.month === n.month && b.day === n.day;
}
