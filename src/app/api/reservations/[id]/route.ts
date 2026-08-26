import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, notFound, parseBody, unauthorized } from "@/lib/api";
import { fromJst } from "@/lib/jst";
import { notifyReservationEvent } from "@/lib/messaging";
import { conflictMessage, findReservationConflict } from "@/lib/availability";

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
  // 予約内容の編集（顧客・メニュー・担当・日時・料金・メモ）
  z.object({
    action: z.literal("update"),
    customerId: z.string().min(1, "顧客を選択してください"),
    serviceId: z.string().nullable().optional(),
    staffId: z.string().nullable().optional(),
    date: z.string().regex(DATE_RE, "日付の形式が不正です"),
    time: z.string().regex(TIME_RE, "時刻の形式が不正です"),
    price: z.number().int().min(0, "料金は0以上で入力してください"),
    note: z.string().max(1000, "メモが長すぎます").optional(),
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
        // 同時に2回押されても二重加算しないよう、ステータス条件付きで確保する。
        // 先に遷移させた側だけが更新に成功し、もう一方は 0件となって中断する。
        const claimed = await tx.reservation.updateMany({
          where: { id: reservation.id, status: { in: ["PENDING", "CONFIRMED"] } },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
        if (claimed.count === 0) return null;
        const r = await tx.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
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
      if (!updated) return invalidTransition();
      return NextResponse.json(updated);
    }

    // 来店済み → 確定へ戻す（顧客統計を逆演算）
    case "uncomplete": {
      if (reservation.status !== "COMPLETED") return invalidTransition();
      const updated = await prisma.$transaction(async (tx) => {
        const claimed = await tx.reservation.updateMany({
          where: { id: reservation.id, status: "COMPLETED" },
          data: { status: "CONFIRMED", completedAt: null },
        });
        if (claimed.count === 0) return null;
        const r = await tx.reservation.findUniqueOrThrow({ where: { id: reservation.id } });
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
      if (!updated) return invalidTransition();
      return NextResponse.json(updated);
    }

    // 未確定・確定の日時変更（所要時間を維持・日時変更通知）
    case "reschedule": {
      if (!isActive) return invalidTransition();
      const durationMs = reservation.endAt.getTime() - reservation.startAt.getTime();
      const startAt = fromJst(data.date, data.time);
      const endAt = new Date(startAt.getTime() + durationMs);

      const conflict = await findReservationConflict({
        storeId: session.storeId,
        startAt,
        endAt,
        staffId: reservation.staffId,
        excludeReservationId: reservation.id,
      });
      if (conflict) return jsonError(conflictMessage(conflict));

      const updated = await prisma.reservation.update({
        where: { id: reservation.id },
        data: { startAt, endAt },
      });
      await notifyReservationEvent(reservation.id, "RESCHEDULE");
      return NextResponse.json(updated);
    }

    // 予約内容の編集（来店済みも記録訂正のため編集可。キャンセル済みは不可）
    case "update": {
      if (!isActive && reservation.status !== "COMPLETED") return invalidTransition();

      // 参照先がすべて自店舗のものであることを確認
      const [customer, service, staff] = await Promise.all([
        prisma.customer.findFirst({
          where: { id: data.customerId, storeId: session.storeId },
          select: { id: true },
        }),
        data.serviceId
          ? prisma.service.findFirst({
              where: { id: data.serviceId, storeId: session.storeId },
              select: { id: true, durationMin: true },
            })
          : Promise.resolve(null),
        data.staffId
          ? prisma.staffMember.findFirst({
              where: { id: data.staffId, storeId: session.storeId },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);
      if (!customer) return jsonError("顧客が見つかりません");
      if (data.serviceId && !service) return jsonError("メニューが見つかりません");
      if (data.staffId && !staff) return jsonError("担当者が見つかりません");

      // メニュー変更時は所要時間を新しいメニューから取り直す
      const durationMs = service
        ? service.durationMin * 60_000
        : reservation.endAt.getTime() - reservation.startAt.getTime();
      const startAt = fromJst(data.date, data.time);
      const endAt = new Date(startAt.getTime() + durationMs);

      // 変更後の枠が空いているか（来店済みの記録訂正では判定しない）
      if (isActive) {
        const conflict = await findReservationConflict({
          storeId: session.storeId,
          startAt,
          endAt,
          staffId: data.staffId ?? null,
          excludeReservationId: reservation.id,
        });
        if (conflict) return jsonError(conflictMessage(conflict));
      }

      // 来店済み予約の編集では、顧客の来店統計も整合させる必要がある。
      // 料金や顧客の付け替えを行っても統計が古いままだと、累計利用額・
      // 来店回数・最終来店日が実態とズレてしまうため。
      const updated = await prisma.$transaction(async (tx) => {
        const r = await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            customerId: data.customerId,
            serviceId: data.serviceId ?? null,
            staffId: data.staffId ?? null,
            startAt,
            endAt,
            price: data.price,
            note: data.note ?? "",
          },
        });

        if (reservation.status === "COMPLETED") {
          const customerChanged = data.customerId !== reservation.customerId;

          // 顧客ごとの来店済み予約から統計を数え直す（差分計算より確実）
          const recalc = async (customerId: string) => {
            const [agg, count] = await Promise.all([
              tx.reservation.aggregate({
                where: { customerId, storeId: session.storeId, status: "COMPLETED" },
                _sum: { price: true },
                _max: { startAt: true },
                _min: { startAt: true },
              }),
              tx.reservation.count({
                where: { customerId, storeId: session.storeId, status: "COMPLETED" },
              }),
            ]);
            await tx.customer.updateMany({
              where: { id: customerId, storeId: session.storeId },
              data: {
                visitCount: count,
                totalSpent: agg._sum.price ?? 0,
                lastVisitAt: agg._max.startAt,
                firstVisitAt: agg._min.startAt,
              },
            });
          };

          await recalc(data.customerId);
          // 別の顧客へ付け替えた場合は、元の顧客の統計も数え直す
          if (customerChanged) await recalc(reservation.customerId);
        }

        return r;
      });

      // 日時が実際に変わった確定済み予約のときだけ日時変更通知を送る
      // （料金やメモの修正のたびにお客様へ通知しないため）
      const datetimeChanged = startAt.getTime() !== reservation.startAt.getTime();
      if (datetimeChanged && reservation.status === "CONFIRMED") {
        await notifyReservationEvent(reservation.id, "RESCHEDULE");
      }
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
