import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { getApiSession, parseBody, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/db";
import { segmentRulesSchema } from "@/lib/segments";

/** セグメント一覧 */
export async function GET() {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const segments = await prisma.segment.findMany({
    where: { storeId: session.storeId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(segments);
}

const createSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "セグメント名を入力してください")
    .max(100, "セグメント名は100文字以内で入力してください"),
  rules: segmentRulesSchema.default({}),
});

/** セグメント作成 */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, createSchema);
  if (error) return error;

  const segment = await prisma.segment.create({
    data: {
      storeId: session.storeId,
      name: data.name,
      rules: data.rules as Prisma.InputJsonValue,
    },
  });
  return NextResponse.json(segment);
}
