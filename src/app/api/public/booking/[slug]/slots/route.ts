import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, notFound } from "@/lib/api";
import { fromJst } from "@/lib/jst";
import { computeDaySlots } from "../shared";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません")
    .refine((d) => !Number.isNaN(fromJst(d).getTime()), "日付が正しくありません"),
  serviceId: z.string().min(1, "メニューを指定してください"),
  staffId: z.string().min(1).optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(req.url);

  const parsed = querySchema.safeParse({
    date: searchParams.get("date") ?? undefined,
    serviceId: searchParams.get("serviceId") ?? undefined,
    staffId: searchParams.get("staffId") ?? undefined,
  });
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "パラメータが正しくありません");
  }
  const { date, serviceId, staffId } = parsed.data;

  const store = await prisma.store.findUnique({ where: { slug } });
  if (!store) return notFound("店舗が見つかりませんでした");

  const service = await prisma.service.findFirst({
    where: { id: serviceId, storeId: store.id, active: true },
  });
  if (!service) return notFound("メニューが見つかりませんでした");

  if (staffId) {
    const staff = await prisma.staffMember.findFirst({
      where: { id: staffId, storeId: store.id, active: true },
    });
    if (!staff) return notFound("スタッフが見つかりませんでした");
  }

  const slots = await computeDaySlots({
    store,
    service,
    staffId: staffId ?? null,
    dateYmd: date,
  });

  return NextResponse.json({ slots });
}
