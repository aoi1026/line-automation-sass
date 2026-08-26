import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, unauthorized } from "@/lib/api";
import { fromJst, jstYmd } from "@/lib/jst";
import {
  loadCalendarData,
  normalizeView,
} from "@/app/dashboard/reservations/calendar/_components/calendar-data";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 予約カレンダー（タイムグリッド）用のデータを期間まとめて取得する。
 * ?view=day|week&date=YYYY-MM-DD&staffId=
 */
export async function GET(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);

  const rawDate = searchParams.get("date");
  if (rawDate && (!DATE_RE.test(rawDate) || Number.isNaN(fromJst(rawDate).getTime()))) {
    return jsonError("日付の形式が不正です");
  }
  const date = rawDate ?? jstYmd(new Date());

  const rawView = searchParams.get("view");
  if (rawView && rawView !== "day" && rawView !== "week") {
    return jsonError("表示単位の指定が不正です");
  }
  const view = normalizeView(rawView ?? undefined);

  const staffId = searchParams.get("staffId");
  if (staffId) {
    const staff = await prisma.staffMember.findFirst({
      where: { id: staffId, storeId: session.storeId },
      select: { id: true },
    });
    if (!staff) return jsonError("スタッフが見つかりません");
  }

  const data = await loadCalendarData({ storeId: session.storeId, view, date });

  if (staffId) {
    return NextResponse.json({
      ...data,
      blocks: data.blocks.filter((b) => b.staffId === staffId),
    });
  }
  return NextResponse.json(data);
}
