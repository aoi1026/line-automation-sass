import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, parseBody, unauthorized } from "@/lib/api";
import { fromJst, jstYmd } from "@/lib/jst";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const createHolidaySchema = z.object({
  date: z.string().regex(DATE_RE, "日付を選択してください"),
  reason: z
    .string()
    .trim()
    .max(100, "理由は100文字以内で入力してください")
    .optional()
    .default(""),
});

/** "YYYY-MM-DD"（JST）を JST 00:00 の Date に変換。不正な日付は null */
function toJstDate(ymd: string): Date | null {
  const date = fromJst(ymd);
  if (Number.isNaN(date.getTime()) || jstYmd(date) !== ymd) return null;
  return date;
}

/** 臨時休業日の一覧（?from=YYYY-MM-DD &to=YYYY-MM-DD で期間を絞り込み） */
export async function GET(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from")?.trim() ?? "";
  const toParam = searchParams.get("to")?.trim() ?? "";

  const from = DATE_RE.test(fromParam) ? toJstDate(fromParam) : null;
  const to = DATE_RE.test(toParam) ? toJstDate(toParam) : null;
  if ((fromParam && !from) || (toParam && !to)) {
    return jsonError("期間の日付が不正です");
  }

  const holidays = await prisma.storeHoliday.findMany({
    where: {
      storeId: session.storeId,
      ...(from || to
        ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(holidays);
}

/** 臨時休業日を登録（同じ日付の重複登録は不可） */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, createHolidaySchema);
  if (error) return error;

  const date = toJstDate(data.date);
  if (!date) return jsonError("日付が不正です");

  const existing = await prisma.storeHoliday.findFirst({
    where: { storeId: session.storeId, date },
    select: { id: true },
  });
  if (existing) return jsonError("この日付はすでに登録されています", 409);

  try {
    const holiday = await prisma.storeHoliday.create({
      data: { storeId: session.storeId, date, reason: data.reason },
    });
    return NextResponse.json(holiday);
  } catch (e) {
    // 同時登録などによる一意制約違反
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return jsonError("この日付はすでに登録されています", 409);
    }
    throw e;
  }
}
