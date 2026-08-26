import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiSession, unauthorized } from "@/lib/api";

/** 自動配信設定の全件取得（存在する設定行のみ。未設定の種別はデフォルト値扱い） */
export async function GET() {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const settings = await prisma.automationSetting.findMany({
    where: { storeId: session.storeId },
  });
  return NextResponse.json(settings);
}
