import { NextResponse } from "next/server";
import { runAutomations } from "@/lib/automation/engine";

export const dynamic = "force-dynamic";

/**
 * 外部cron用エンドポイント。
 * GET /api/cron/run?secret=<CRON_SECRET>
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret") ?? req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  const summary = await runAutomations();
  return NextResponse.json(summary);
}
