import { prisma } from "@/lib/db";

export type ConflictKind = "staff" | "capacity";

/**
 * 指定の時間帯に予約を入れられるかを判定する。
 * `@/lib/slots` の getAvailableSlots と同じ考え方:
 *  - 指名あり: そのスタッフに重なる予約があれば不可
 *  - 指名なし/指名あり共通: 重複予約数がアクティブスタッフ数（キャパ）以上なら不可
 *
 * 空き枠計算（公開予約ページ）と管理画面からの登録・変更で判定をそろえ、
 * ダブルブッキングを防ぐために用いる。
 */
export async function findReservationConflict(params: {
  storeId: string;
  startAt: Date;
  endAt: Date;
  staffId?: string | null;
  /** 日時変更・編集時に、対象の予約自身を除外する */
  excludeReservationId?: string;
}): Promise<ConflictKind | null> {
  const { storeId, startAt, endAt, staffId, excludeReservationId } = params;

  const [overlapping, staffCount] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        storeId,
        status: { in: ["PENDING", "CONFIRMED"] },
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
        // 重なり判定: 既存.start < 新規.end かつ 新規.start < 既存.end
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { staffId: true },
    }),
    prisma.staffMember.count({ where: { storeId, active: true } }),
  ]);

  const capacity = Math.max(1, staffCount);

  if (staffId && overlapping.some((r) => r.staffId === staffId)) return "staff";
  if (overlapping.length >= capacity) return "capacity";
  return null;
}

export function conflictMessage(kind: ConflictKind): string {
  return kind === "staff"
    ? "指定の担当者は、その時間帯に別の予約が入っています。"
    : "その時間帯は予約が埋まっています。別の時間をお選びください。";
}
