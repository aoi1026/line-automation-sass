import { prisma } from "@/lib/db";
import { jstYmd } from "@/lib/jst";

/**
 * 指定期間の臨時休業日を JST "YYYY-MM-DD" の配列で取得する。
 * getAvailableSlots の holidays オプションにそのまま渡せる。
 */
export async function getHolidayYmds(
  storeId: string,
  from?: Date,
  to?: Date
): Promise<string[]> {
  const holidays = await prisma.storeHoliday.findMany({
    where: {
      storeId,
      ...(from || to
        ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
    select: { date: true },
  });
  return holidays.map((h) => jstYmd(h.date));
}
