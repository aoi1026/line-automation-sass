import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, notFound, parseBody, unauthorized } from "@/lib/api";
import { fromJst } from "@/lib/jst";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z.object({
  customerId: z.string().min(1, "顧客を選択してください"),
  reservationId: z.string().nullable().optional(),
  staffId: z.string().nullable().optional(),
  serviceName: z.string().trim().max(200, "メニュー名が長すぎます").optional().default(""),
  content: z
    .string()
    .trim()
    .min(1, "施術内容を入力してください")
    .max(5000, "施術内容が長すぎます"),
  materials: z.string().max(5000, "使用薬剤が長すぎます").optional().default(""),
  nextNote: z.string().max(5000, "申し送りが長すぎます").optional().default(""),
  visitedAt: z.string().regex(DATE_RE, "来店日の形式が不正です"),
});

const recordInclude = {
  staff: { select: { id: true, name: true } },
} satisfies Prisma.TreatmentRecordInclude;

/** カルテ一覧（?customerId= 顧客別 / ?reservationId= 予約別） */
export async function GET(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId")?.trim() ?? "";
  const reservationId = searchParams.get("reservationId")?.trim() ?? "";

  const where: Prisma.TreatmentRecordWhereInput = {
    storeId: session.storeId,
    ...(customerId ? { customerId } : {}),
    ...(reservationId ? { reservationId } : {}),
  };

  const records = await prisma.treatmentRecord.findMany({
    where,
    include: recordInclude,
    orderBy: [{ visitedAt: "desc" }, { createdAt: "desc" }],
    take: 500,
  });
  return NextResponse.json(records);
}

/** カルテを新規作成（予約に紐づける場合は1予約1件まで） */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, createSchema);
  if (error) return error;

  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, storeId: session.storeId },
    select: { id: true },
  });
  if (!customer) return notFound("顧客が見つかりませんでした");

  let reservationId: string | null = null;
  if (data.reservationId) {
    const reservation = await prisma.reservation.findFirst({
      where: { id: data.reservationId, storeId: session.storeId },
      select: { id: true, customerId: true },
    });
    if (!reservation) return notFound("予約が見つかりませんでした");
    if (reservation.customerId !== customer.id) {
      return jsonError("予約とお客様が一致しません");
    }
    const existing = await prisma.treatmentRecord.findUnique({
      where: { reservationId: reservation.id },
      select: { id: true },
    });
    if (existing) return jsonError("この予約のカルテはすでに作成されています", 409);
    reservationId = reservation.id;
  }

  let staffId: string | null = null;
  if (data.staffId) {
    const staff = await prisma.staffMember.findFirst({
      where: { id: data.staffId, storeId: session.storeId },
      select: { id: true },
    });
    if (!staff) return notFound("スタッフが見つかりませんでした");
    staffId = staff.id;
  }

  const record = await prisma.treatmentRecord.create({
    data: {
      storeId: session.storeId,
      customerId: customer.id,
      reservationId,
      staffId,
      serviceName: data.serviceName,
      content: data.content,
      materials: data.materials,
      nextNote: data.nextNote,
      visitedAt: fromJst(data.visitedAt),
    },
    include: recordInclude,
  });
  return NextResponse.json(record);
}
