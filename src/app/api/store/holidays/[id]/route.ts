import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiSession, notFound, unauthorized } from "@/lib/api";

/** 臨時休業日を削除 */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const holiday = await prisma.storeHoliday.findFirst({
    where: { id, storeId: session.storeId },
    select: { id: true },
  });
  if (!holiday) return notFound("休業日が見つかりませんでした");

  await prisma.storeHoliday.delete({ where: { id: holiday.id } });
  return NextResponse.json({ ok: true });
}
