import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma, ReservationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, parseBody, unauthorized } from "@/lib/api";
import { addDays, addMinutes, fromJst } from "@/lib/jst";
import { notifyReservationEvent } from "@/lib/messaging";
import { conflictMessage, findReservationConflict } from "@/lib/availability";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const STATUS_VALUES: ReservationStatus[] = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

const createSchema = z.object({
  customerId: z.string().min(1, "顧客を選択してください"),
  serviceId: z.string().nullable().optional(),
  staffId: z.string().nullable().optional(),
  date: z.string().regex(DATE_RE, "日付の形式が不正です"),
  time: z.string().regex(TIME_RE, "時刻の形式が不正です"),
  price: z.number().int("金額は整数で入力してください").min(0, "金額は0以上で入力してください"),
  note: z.string().max(2000, "メモが長すぎます").optional().default(""),
  // 店舗登録の予約は未確定でも作成できる（省略時は確定）
  status: z.enum(["PENDING", "CONFIRMED"]).optional(),
});

/** 予約一覧を取得（?date=YYYY-MM-DD で日別 / ?status= で絞り込み） */
export async function GET(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);

  const where: Prisma.ReservationWhereInput = { storeId: session.storeId };

  const date = searchParams.get("date");
  if (date) {
    if (!DATE_RE.test(date)) return jsonError("日付の形式が不正です");
    where.startAt = { gte: fromJst(date), lt: addDays(fromJst(date), 1) };
  }

  const status = searchParams.get("status");
  if (status) {
    if (!(STATUS_VALUES as string[]).includes(status)) {
      return jsonError("ステータスの指定が不正です");
    }
    where.status = status as ReservationStatus;
  }

  const reservations = await prisma.reservation.findMany({
    where,
    include: { customer: true, service: true, staff: true },
    orderBy: { startAt: "asc" },
  });
  return NextResponse.json(reservations);
}

/** 予約を新規作成（確定・店舗登録として登録し、予約確認通知を送信） */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, createSchema);
  if (error) return error;

  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, storeId: session.storeId },
    select: { id: true },
  });
  if (!customer) return jsonError("顧客が見つかりません");

  let serviceId: string | null = null;
  let durationMin = 60;
  if (data.serviceId) {
    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, storeId: session.storeId },
      select: { id: true, durationMin: true },
    });
    if (!service) return jsonError("メニューが見つかりません");
    serviceId = service.id;
    durationMin = service.durationMin;
  }

  let staffId: string | null = null;
  if (data.staffId) {
    const staff = await prisma.staffMember.findFirst({
      where: { id: data.staffId, storeId: session.storeId },
      select: { id: true },
    });
    if (!staff) return jsonError("スタッフが見つかりません");
    staffId = staff.id;
  }

  const startAt = fromJst(data.date, data.time);
  const endAt = addMinutes(startAt, durationMin);

  // 公開予約ページと同じ基準で空き状況を判定し、ダブルブッキングを防ぐ
  const conflict = await findReservationConflict({
    storeId: session.storeId,
    startAt,
    endAt,
    staffId,
  });
  if (conflict) return jsonError(conflictMessage(conflict), 409);

  const status = data.status ?? "CONFIRMED";

  const reservation = await prisma.reservation.create({
    data: {
      storeId: session.storeId,
      customerId: customer.id,
      serviceId,
      staffId,
      startAt,
      endAt,
      status,
      source: "MANUAL",
      price: data.price,
      note: data.note,
    },
  });

  // 未確定で作成した場合は確定通知を送らない（確定操作時に送信される）
  // 通知の失敗は予約作成を妨げない（notifyReservationEvent 内部で捕捉される）
  if (status === "CONFIRMED") {
    await notifyReservationEvent(reservation.id, "BOOKING_CONFIRMATION");
  }

  return NextResponse.json(reservation);
}
