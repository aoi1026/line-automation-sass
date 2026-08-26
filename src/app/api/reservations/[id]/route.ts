import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, notFound, parseBody, unauthorized } from "@/lib/api";
import { fromJst } from "@/lib/jst";
import { notifyReservationEvent } from "@/lib/messaging";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({
    action: z.literal("cancel"),
    cancelReason: z.string().max(500, "キャンセル理由が長すぎます").optional(),
  }),
  z.object({ action: z.literal("no_show") }),
  z.object({ action: z.literal("complete") }),
  z.object({ action: z.literal("uncomplete") }),
  z.object({
    action: z.literal("reschedule"),
    date: z.string().regex(DATE_RE, "日付の形式が不正です"),
    time: z.string().regex(TIME_RE, "時刻の形式が不正です"),
  }),
]);

function invalidTransition() {
  return jsonError("この操作は現在のステータスでは行えません");
}

/** 予約詳細を取得 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const reservation = await prisma.reservation.findFirst({
    where: { id, storeId: session.storeId },
    include: { customer: true, service: true, staff: true },
  });
  if (!reservation) return notFound("予約が見つかりません");
  return NextResponse.json(reservation);
}

/** 予約への操作（確定・キャンセル・無断キャンセル・来店済み・取り消し・日時変更） */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const reservation = await prisma.reservation.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!reservation) return notFound("予約が見つかりません");

  const { data, error } = await parseBody(req, patchSchema);
  if (error) return error;

  const isActive = reservation.status === "PENDING" || reservation.status === "CONFIRMED";

  switch (data.action) {
    // 未確定 → 確定（予約確認通知）
    case "confirm": {
      if (reservation.status !== "PENDING") return invalidTransition();
      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "CONFIRMED" },
      });
      await notifyReservationEvent(reservation.id, "BOOKING_CONFIRMATION");
      return NextResponse.json(updated);
    }

    // 未確定・確定 → キャンセル（キャンセル通知）
    case "cancel": {
      if (!isActive) return invalidTransition();
      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "CANCELLED", cancelReason: data.cancelReason ?? "" },
      });
      await notifyReservationEvent(reservation.id, "CANCELLATION");
      return NextResponse.json(updated);
    }

    // 未確定・確定 → 無断キャンセル
    case "no_show": {
      if (!isActive) return invalidTransition();
      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: { status: "NO_SHOW" },
      });
      return NextResponse.json(updated);
    }

    // 未確定・確定 → 来店済み（顧客統計を加算）
    case "complete": {
      if (!isActive) return invalidTransition();
      const updated = await prisma.$transaction(async (tx) => {
        const r = await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: "COMPLETED", completedAt: new Date() },
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
        return r;
      });
      return NextResponse.json(updated);
    }

    // 来店済み → 確定へ戻す（顧客統計を逆演算）
    case "uncomplete": {
      if (reservation.status !== "COMPLETED") return invalidTransition();
      const updated = await prisma.$transaction(async (tx) => {
        const r = await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: "CONFIRMED", completedAt: null },
        });
        const customer = await tx.customer.findFirst({
          where: { id: reservation.customerId, storeId: session.storeId },
        });
        if (customer) {
          // この予約を除いた残りの来店済み予約から最終・初回来店日を再計算
          const agg = await tx.reservation.aggregate({
            where: {
              customerId: customer.id,
              storeId: session.storeId,
              status: "COMPLETED",
              id: { not: reservation.id },
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
        return r;
      });
      return NextResponse.json(updated);
    }

    // 未確定・確定の日時変更（所要時間を維持・日時変更通知）
    case "reschedule": {
      if (!isActive) return invalidTransition();
      const durationMs = reservation.endAt.getTime() - reservation.startAt.getTime();
      const startAt = fromJst(data.date, data.time);
      const endAt = new Date(startAt.getTime() + durationMs);
      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: { startAt, endAt },
      });
      await notifyReservationEvent(reservation.id, "RESCHEDULE");
      return NextResponse.json(updated);
    }
  }
}

/** 予約を削除（キャンセル・無断キャンセルの予約のみ） */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const reservation = await prisma.reservation.findFirst({
    where: { id, storeId: session.storeId },
    select: { id: true, status: true },
  });
  if (!reservation) return notFound("予約が見つかりません");

  if (reservation.status !== "CANCELLED" && reservation.status !== "NO_SHOW") {
    return jsonError("キャンセルまたは無断キャンセルの予約のみ削除できます");
  }

  await prisma.reservation.delete({ where: { id: reservation.id } });
  return NextResponse.json({ ok: true });
}
