import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, notFound, parseBody, unauthorized } from "@/lib/api";

const actionSchema = z.object({
  action: z.enum(["redeem", "unredeem"]),
});

/** クーポン発行の使用済み状態を切り替える（使用済みにする / 取り消す） */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getApiSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const issue = await prisma.couponIssue.findFirst({
    where: { id, coupon: { storeId: session.storeId } },
  });
  if (!issue) return notFound("クーポンの発行履歴が見つかりませんでした");

  const { data, error } = await parseBody(req, actionSchema);
  if (error) return error;

  if (data.action === "redeem") {
    if (issue.usedAt) return jsonError("このクーポンはすでに使用済みです");
    const updated = await prisma.couponIssue.update({
      where: { id: issue.id },
      data: { usedAt: new Date() },
    });
    return NextResponse.json({ ok: true, usedAt: updated.usedAt });
  }

  // unredeem: 使用済みを取り消して未使用に戻す
  if (!issue.usedAt) return jsonError("このクーポンは未使用です");
  const updated = await prisma.couponIssue.update({
    where: { id: issue.id },
    data: { usedAt: null },
  });
  return NextResponse.json({ ok: true, usedAt: updated.usedAt });
}
