import type { Store } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDays, addHours } from "@/lib/jst";
import { loadSetting, sendAutomationMessage } from "@/lib/messaging";
import type { KindCounts } from "./types";
import { emptyCounts, tally } from "./types";

/**
 * 予約確認メッセージを送った直後の予約をリマインダーの対象から外す猶予時間。
 * 当日・翌日など間近の予約を登録すると、確認メッセージの直後にリマインダーの送信条件も
 * 満たしてしまい、お客様にほぼ同じ内容が2通続けて届いてしまうため。
 */
export const REMINDER_CONFIRMATION_GRACE_HOURS = 2;

/**
 * 同一予約に対してリマインダー送信を試行する上限回数。
 * LINE側の一時的な不調で失敗した分は再送するが、恒久的な失敗（無効なユーザーIDなど）で
 * 毎回送信を試み続けないよう、失敗ログの件数で打ち切る。
 */
export const REMINDER_MAX_ATTEMPTS = 3;

/**
 * リマインダー自動配信:
 * 確定済み予約のうち、開始時刻が「現在〜設定オフセット後」の範囲にあり、
 * まだリマインダーを送っていないものに送信する。
 *
 * 送信済みの判定:
 * - SENT / SKIPPED のログがあれば送信済みとみなす
 * - FAILED のログしかない場合は一時的な送信失敗とみなして再試行する
 *   （REMINDER_MAX_ATTEMPTS 回の失敗で打ち切る）
 *
 * 注意: 再試行で sendAutomationMessage を呼び直すと、リマインダーにクーポン・アンケートを
 * 設定している場合はその都度 CouponIssue / SurveyRequest が新規発行される。
 * 発行済みリンクの再利用は共有ライブラリ（@/lib/messaging）側の変更が必要で本担当の範囲外のため、
 * 再試行回数の上限（REMINDER_MAX_ATTEMPTS）で発行数の上振れを抑えるにとどめている。
 */
export async function runReminders(store: Store, now: Date): Promise<KindCounts> {
  const counts = emptyCounts();
  const setting = await loadSetting(store.id, "REMINDER");
  if (!setting?.enabled) return counts;

  const windowEnd =
    setting.offsetUnit === "hours"
      ? addHours(now, setting.offsetValue)
      : addDays(now, setting.offsetValue);

  // この時刻より後に予約確認メッセージが届いている予約は、今回のリマインダー対象から外す
  const confirmationCutoff = addHours(now, -REMINDER_CONFIRMATION_GRACE_HOURS);

  const reservations = await prisma.reservation.findMany({
    where: {
      storeId: store.id,
      status: "CONFIRMED",
      startAt: { gt: now, lte: windowEnd },
      AND: [
        // 送信済み（SENT / SKIPPED）のリマインダーがない予約だけを対象にする
        { messageLogs: { none: { kind: "REMINDER", status: { not: "FAILED" } } } },
        // 予約確認メッセージが直前に届いた予約は、同内容が続けて届くのを避けて次回以降に回す
        {
          messageLogs: {
            none: {
              kind: "BOOKING_CONFIRMATION",
              status: "SENT",
              sentAt: { gt: confirmationCutoff },
            },
          },
        },
      ],
    },
    include: { customer: true, service: true, staff: true },
  });

  if (reservations.length === 0) return counts;

  // 予約ごとの失敗回数をまとめて数え、上限に達したものは再試行しない
  const failedLogs = await prisma.messageLog.findMany({
    where: {
      storeId: store.id,
      kind: "REMINDER",
      status: "FAILED",
      reservationId: { in: reservations.map((r) => r.id) },
    },
    select: { reservationId: true },
  });
  const failedCountByReservation = new Map<string, number>();
  for (const log of failedLogs) {
    if (!log.reservationId) continue;
    failedCountByReservation.set(
      log.reservationId,
      (failedCountByReservation.get(log.reservationId) ?? 0) + 1
    );
  }

  for (const reservation of reservations) {
    const failedCount = failedCountByReservation.get(reservation.id) ?? 0;
    if (failedCount >= REMINDER_MAX_ATTEMPTS) continue;

    const log = await sendAutomationMessage({
      store, customer: reservation.customer, kind: "REMINDER",
      reservation, setting, now,
    });
    tally(counts, log);
  }
  return counts;
}
