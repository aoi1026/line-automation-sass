import { NextResponse } from "next/server";
import { getApiSession, unauthorized } from "@/lib/api";
import { runAutomations } from "@/lib/automation/engine";

export const dynamic = "force-dynamic";

/**
 * 自店舗の自動配信を今すぐ実行する
 * POST /api/automations/run
 */
export async function POST() {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const summary = await runAutomations({ storeId: session.storeId });
  return NextResponse.json(summary);
}
