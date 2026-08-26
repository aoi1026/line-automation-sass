import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, parseBody } from "@/lib/api";
import { DEFAULT_BUSINESS_HOURS, type BusinessHours } from "@/lib/constants";
import { addDays, addMinutes, fromJst } from "@/lib/jst";
import { notifyReservationEvent } from "@/lib/messaging";
import { getAvailableSlots } from "@/lib/slots";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const bookingSchema = z.object({
  slug: z.string().min(1, "店舗が指定されていません"),
  serviceId: z.string().min(1, "メニューを選択してください"),
  staffId: z.string().nullable().optional(),
  date: z.string().regex(DATE_RE, "日付の形式が不正です"),
  time: z.string().regex(TIME_RE, "時刻の形式が不正です"),
  name: z.string().trim().min(1, "お名前を入力してください").max(100, "お名前が長すぎます"),
  phone: z
    .string()
    .trim()
    .min(1, "電話番号を入力してください")
    .max(20, "電話番号が長すぎます")
    .regex(/^[0-9+\-() ]+$/, "電話番号の形式が正しくありません"),
  email: z
    .union([z.literal(""), z.string().trim().email("メールアドレスの形式が正しくありません")])
    .optional()
    .default(""),
  note: z.string().max(2000, "ご要望が長すぎます").optional().default(""),
});

function parseBusinessHours(value: unknown): BusinessHours {
  if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0) {
    return { ...DEFAULT_BUSINESS_HOURS, ...(value as Partial<BusinessHours>) };
  }
  return DEFAULT_BUSINESS_HOURS;
}

/** 公開Web予約: 予約を作成（認証不要・slugでスコープ） */
export async function POST(req: Request) {
  const { data, error } = await parseBody(req, bookingSchema);
  if (error) return error;

  const store = await prisma.store.findUnique({ where: { slug: data.slug } });
  if (!store) return jsonError("店舗が見つかりません", 404);

  const service = await prisma.service.findFirst({
    where: { id: data.serviceId, storeId: store.id, active: true },
  });
  if (!service) return jsonError("メニューが見つかりません", 404);

  let staffId: string | null = null;
  if (data.staffId) {
    const staff = await prisma.staffMember.findFirst({
      where: { id: data.staffId, storeId: store.id, active: true },
      select: { id: true },
    });
    if (!staff) return jsonError("スタッフが見つかりません", 404);
    staffId = staff.id;
  }

  // 空き枠をサーバー側で再検証（同時予約による競合を防止）
  const dayStart = fromJst(data.date);
  const [staffCount, reservations] = await Promise.all([
    prisma.staffMember.count({ where: { storeId: store.id, active: true } }),
    prisma.reservation.findMany({
      where: {
        storeId: store.id,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { gte: dayStart, lt: addDays(dayStart, 1) },
      },
      select: { startAt: true, endAt: true, staffId: true },
    }),
  ]);

  const available = getAvailableSlots({
    businessHours: parseBusinessHours(store.businessHours),
    slotIntervalMin: store.slotIntervalMin,
    durationMin: service.durationMin,
    dateYmd: data.date,
    reservations,
    staffId,
    staffCount,
    now: new Date(),
  });
  if (!available.includes(data.time)) {
    return jsonError("申し訳ありません、その時間は埋まってしまいました", 409);
  }

  // 顧客照合: 同一店舗で電話番号が完全一致する顧客がいれば再利用
  let customer = await prisma.customer.findFirst({
    where: { storeId: store.id, phone: data.phone },
  });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        storeId: store.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
      },
    });
  }

  const startAt = fromJst(data.date, data.time);
  const endAt = addMinutes(startAt, service.durationMin);

  const reservation = await prisma.reservation.create({
    data: {
      storeId: store.id,
      customerId: customer.id,
      serviceId: service.id,
      staffId,
      startAt,
      endAt,
      status: "CONFIRMED",
      source: "WEB",
      price: service.price,
      note: data.note,
    },
  });

  await notifyReservationEvent(reservation.id, "BOOKING_CONFIRMATION");

  return NextResponse.json({ ok: true, token: reservation.publicToken });
}
