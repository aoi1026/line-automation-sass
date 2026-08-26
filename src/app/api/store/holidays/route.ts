import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, parseBody, unauthorized } from "@/lib/api";
import { fromJst, jstYmd } from "@/lib/jst";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const createHolidaySchema = z.object({
  date: z
    .string()
    .regex(DATE_RE, "日付の形式が不正です")
    .refine((d) => !Number.isNaN(fromJst(d).getTime()), "日付が正しくありません"),
  reason: z.string().trim().max(200, "理由は200文字以内で入力してください").optional(),
});

/** 臨時休業日の一覧（これからの休業日を先頭に、過去は新しい順で後ろに並べる） */
export async function GET() {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const holidays = await prisma.storeHoliday.findMany({
    where: { storeId: session.storeId },
    orderBy: { date: "asc" },
  });

  const todayStart = fromJst(jstYmd(new Date()));
  const upcoming = holidays.filter((h) => h.date >= todayStart);
  const past = holidays.filter((h) => h.date < todayStart).reverse();

  return NextResponse.json([...upcoming, ...past]);
}

/** 臨時休業日を登録 */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, createHolidaySchema);
  if (error) return error;

  // JST日付の00:00をUTCで保存する
  const date = fromJst(data.date);

  const existing = await prisma.storeHoliday.findFirst({
    where: { storeId: session.storeId, date },
    select: { id: true },
  });
  if (existing) return jsonError("その日は既に登録されています");

  try {
    const holiday = await prisma.storeHoliday.create({
      data: {
        storeId: session.storeId,
        date,
        reason: data.reason ?? "",
      },
    });
    return NextResponse.json(holiday);
  } catch (e) {
    // 同時登録などで @@unique([storeId, date]) に衝突した場合
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return jsonError("その日は既に登録されています");
    }
    throw e;
  }
}
