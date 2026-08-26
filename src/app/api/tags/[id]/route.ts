import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiSession, notFound, unauthorized } from "@/lib/api";

/** タグを削除（顧客との紐付けも削除される） */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const tag = await prisma.tag.findFirst({
    where: { id, storeId: session.storeId },
    select: { id: true },
  });
  if (!tag) return notFound("タグが見つかりませんでした");

  await prisma.tag.delete({ where: { id: tag.id } });
  return NextResponse.json({ ok: true });
}
