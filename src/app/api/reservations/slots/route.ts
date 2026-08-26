import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, notFound, unauthorized } from "@/lib/api";
import { DEFAULT_BUSINESS_HOURS, type BusinessHours } from "@/lib/constants";
import { addDays, fromJst } from "@/lib/jst";
import { getAvailableSlots } from "@/lib/slots";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 指定日の予約可能時間枠を取得 (?date=&serviceId=&staffId=&excludeReservationId=) */
export async function GET(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? "";
  if (!DATE_RE.test(date)) return jsonError("日付の形式が不正です");

  const serviceId = searchParams.get("serviceId");
  const staffId = searchParams.get("staffId");
  const excludeReservationId = searchParams.get("excludeReservationId");

  const store = await prisma.store.findUnique({ where: { id: session.storeId } });
  if (!store) return notFound("店舗が見つかりません");

  let durationMin = 60;
  if (serviceId) {
    const service = await prisma.service.findFirst({
      where: { id: serviceId, storeId: session.storeId },
      select: { durationMin: true },
    });
    if (service) durationMin = service.durationMin;
  }

  const dayStart = fromJst(date);
  const dayEnd = addDays(dayStart, 1);

  const [reservations, staffCount] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        storeId: session.storeId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { gte: dayStart, lt: dayEnd },
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
      },
      select: { startAt: true, endAt: true, staffId: true },
    }),
    prisma.staffMember.count({
      where: { storeId: session.storeId, active: true },
    }),
  ]);

  const raw = store.businessHours;
  const hasHours =
    typeof raw === "object" && raw !== null && !Array.isArray(raw) && Object.keys(raw).length > 0;
  const businessHours = hasHours ? (raw as BusinessHours) : DEFAULT_BUSINESS_HOURS;

  const slots = getAvailableSlots({
    businessHours,
    slotIntervalMin: store.slotIntervalMin,
    durationMin,
    dateYmd: date,
    reservations,
    staffId: staffId || null,
    staffCount,
    now: new Date(),
  });

  return NextResponse.json({ slots });
}
