import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, notFound, unauthorized } from "@/lib/api";
import { addHours } from "@/lib/jst";
import { generateLinkCode } from "@/lib/utils";

/** LINE連携用の6桁コードを発行（有効期限24時間） */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { id } = await ctx.params;
  const customer = await prisma.customer.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!customer) return notFound("顧客が見つかりませんでした");
  if (customer.lineUserId) return jsonError("この顧客は既にLINE連携済みです");

  const now = new Date();
  const linkCodeExpiresAt = addHours(now, 24);

  // 店舗内の有効な連携コードと重複しないように再試行する
  let linkCode = generateLinkCode();
  for (let attempt = 0; attempt < 10; attempt++) {
    const duplicate = await prisma.customer.findFirst({
      where: {
        storeId: session.storeId,
        id: { not: customer.id },
        linkCode,
        linkCodeExpiresAt: { gt: now },
      },
      select: { id: true },
    });
    if (!duplicate) break;
    linkCode = generateLinkCode();
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: { linkCode, linkCodeExpiresAt },
  });
  return NextResponse.json({ code: linkCode, expiresAt: linkCodeExpiresAt });
}
