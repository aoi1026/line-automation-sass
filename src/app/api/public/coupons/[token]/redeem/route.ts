import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, notFound } from "@/lib/api";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

/**
 * クーポンの店頭消込（公開ページ用・認証不要）。
 * トークンでスコープし、来店客のブラウザから店頭スタッフが操作する想定。
 */
export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const ip = getClientIp(req);
  const rl = rateLimit(`coupon:${ip}`, 30, 60 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "試行回数が多すぎます。しばらく時間をおいてお試しください。" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const { token } = await ctx.params;

  const issue = await prisma.couponIssue.findUnique({
    where: { token },
    include: { coupon: true },
  });
  if (!issue) return notFound("クーポンが見つかりませんでした");

  if (issue.usedAt) return jsonError("既に使用済みです");

  const now = new Date();
  if (issue.coupon.validFrom && issue.coupon.validFrom > now) {
    return jsonError("このクーポンはまだご利用いただけません");
  }
  if (issue.coupon.validUntil && issue.coupon.validUntil < now) {
    return jsonError("このクーポンは有効期限が切れています");
  }
  if (!issue.coupon.active) {
    return jsonError("このクーポンは現在ご利用いただけません");
  }

  const updated = await prisma.couponIssue.update({
    where: { id: issue.id },
    data: { usedAt: now },
  });

  return NextResponse.json({ ok: true, usedAt: updated.usedAt });
}
