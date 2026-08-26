import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { DEFAULT_BUSINESS_HOURS, type BusinessHours } from "@/lib/constants";
import { addDays, fromJst } from "@/lib/jst";
import { getAvailableSlots } from "@/lib/slots";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseBusinessHours(value: unknown): BusinessHours {
  if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0) {
    return { ...DEFAULT_BUSINESS_HOURS, ...(value as Partial<BusinessHours>) };
  }
  return DEFAULT_BUSINESS_HOURS;
}

/** 公開Web予約: 指定日の空き時間枠を取得（認証不要・slugでスコープ） */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") ?? "";
  const date = searchParams.get("date") ?? "";
  const serviceId = searchParams.get("serviceId") ?? "";
  const staffId = searchParams.get("staffId");

  if (!slug) return jsonError("店舗が指定されていません");
  if (!DATE_RE.test(date)) return jsonError("日付の形式が不正です");
  if (!serviceId) return jsonError("メニューが指定されていません");

  const store = await prisma.store.findUnique({ where: { slug } });
  if (!store) return jsonError("店舗が見つかりません", 404);

  const service = await prisma.service.findFirst({
    where: { id: serviceId, storeId: store.id, active: true },
    select: { durationMin: true },
  });
  if (!service) return jsonError("メニューが見つかりません", 404);

  if (staffId) {
    const staff = await prisma.staffMember.findFirst({
      where: { id: staffId, storeId: store.id, active: true },
      select: { id: true },
    });
    if (!staff) return jsonError("スタッフが見つかりません", 404);
  }

  const dayStart = fromJst(date);
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

  const slots = getAvailableSlots({
    businessHours: parseBusinessHours(store.businessHours),
    slotIntervalMin: store.slotIntervalMin,
    durationMin: service.durationMin,
    dateYmd: date,
    reservations,
    staffId: staffId || null,
    staffCount,
    now: new Date(),
  });

  return NextResponse.json({ slots });
}
