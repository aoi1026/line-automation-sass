import { NextResponse } from "next/server";
import { z } from "zod";
import type { ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, notFound, parseBody, unauthorized } from "@/lib/api";
import { RESERVATION_STATUS_LABELS } from "@/lib/constants";
import { notifyReservationEvent } from "@/lib/messaging";

const statusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
  cancelReason: z.string().max(500, "キャンセル理由が長すぎます").optional(),
});

/** 許可されるステータス遷移 */
const ALLOWED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["PENDING", "COMPLETED", "CANCELLED", "NO_SHOW"],
  COMPLETED: ["PENDING", "CONFIRMED"],
  CANCELLED: ["PENDING", "CONFIRMED"],
  NO_SHOW: ["PENDING", "CONFIRMED"],
};

/** 予約のステータスを変更（来店済み処理では顧客統計も更新） */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const reservation = await prisma.reservation.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!reservation) return notFound("予約が見つかりません");

  const { data, error } = await parseBody(req, statusSchema);
  if (error) return error;

  const current = reservation.status;
  const next = data.status;

  if (!ALLOWED_TRANSITIONS[current].includes(next)) {
    return jsonError(
      `「${RESERVATION_STATUS_LABELS[current]}」から「${RESERVATION_STATUS_LABELS[next]}」への変更はできません`
    );
  }

  // 来店済みへ: 顧客統計を加算
  if (next === "COMPLETED") {
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: "COMPLETED", completedAt: now },
      });
      const customer = await tx.customer.findFirst({
        where: { id: reservation.customerId, storeId: session.storeId },
      });
      if (customer) {
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            visitCount: customer.visitCount + 1,
            totalSpent: customer.totalSpent + reservation.price,
            lastVisitAt:
              !customer.lastVisitAt || reservation.startAt > customer.lastVisitAt
                ? reservation.startAt
                : customer.lastVisitAt,
            firstVisitAt: customer.firstVisitAt ?? reservation.startAt,
          },
        });
      }
    });
    return NextResponse.json({ ok: true });
  }

  // 来店済みから戻す: 顧客統計を逆演算
  if (current === "COMPLETED") {
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: next, completedAt: null },
      });
      const customer = await tx.customer.findFirst({
        where: { id: reservation.customerId, storeId: session.storeId },
      });
      if (customer) {
        // この予約を戻した後に残る COMPLETED 予約から再計算
        const agg = await tx.reservation.aggregate({
          where: {
            customerId: customer.id,
            storeId: session.storeId,
            status: "COMPLETED",
          },
          _max: { startAt: true },
          _min: { startAt: true },
        });
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            visitCount: Math.max(0, customer.visitCount - 1),
            totalSpent: Math.max(0, customer.totalSpent - reservation.price),
            lastVisitAt: agg._max.startAt,
            firstVisitAt: agg._min.startAt,
          },
        });
      }
    });
    return NextResponse.json({ ok: true });
  }

  // キャンセルへ: 理由を保存して通知
  if (next === "CANCELLED") {
    await prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: "CANCELLED", cancelReason: data.cancelReason ?? "" },
    });
    await notifyReservationEvent(reservation.id, "CANCELLATION");
    return NextResponse.json({ ok: true });
  }

  // その他の遷移（確定・未確定へ戻す・無断キャンセル・復元）
  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: next,
      // キャンセル・無断キャンセルから復元する場合は理由をクリア
      ...(current === "CANCELLED" || current === "NO_SHOW" ? { cancelReason: "" } : {}),
    },
  });

  if (current === "PENDING" && next === "CONFIRMED") {
    await notifyReservationEvent(reservation.id, "BOOKING_CONFIRMATION");
  }

  return NextResponse.json({ ok: true });
}
