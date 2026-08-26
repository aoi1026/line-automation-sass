import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiSession, parseBody, unauthorized } from "@/lib/api";
import { countTargets, segmentRulesSchema } from "@/lib/segments";

const previewSchema = z.object({
  rules: segmentRulesSchema.default({}),
});

/** 抽出条件に合致する対象人数のプレビュー */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, previewSchema);
  if (error) return error;

  const count = await countTargets(session.storeId, data.rules);
  return NextResponse.json({ count });
}
