import { NextResponse } from "next/server";
import { getApiSession, unauthorized } from "@/lib/api";
import { runAutomations } from "@/lib/automation/engine";

export const dynamic = "force-dynamic";

/**
 * 自店舗の自動配信を今すぐ実行する
 * POST /api/automations/run
 *
 * 対象はセッションの店舗のみ。runAutomations は店舗ごとに排他するため、
 * 返る結果（件数・errors の店舗名）には他店舗の情報が混ざらない。
 */
export async function POST() {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const summary = await runAutomations({ storeId: session.storeId });
  return NextResponse.json(summary);
}
