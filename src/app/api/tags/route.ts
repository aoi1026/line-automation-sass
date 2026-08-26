import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, parseBody, unauthorized } from "@/lib/api";

const createTagSchema = z.object({
  name: z.string().trim().min(1, "タグ名を入力してください").max(30),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "色の形式が不正です")
    .optional(),
});

/** タグ一覧 */
export async function GET() {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const tags = await prisma.tag.findMany({
    where: { storeId: session.storeId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(tags);
}

/** タグを新規作成 */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, createTagSchema);
  if (error) return error;

  const existing = await prisma.tag.findUnique({
    where: { storeId_name: { storeId: session.storeId, name: data.name } },
  });
  if (existing) return jsonError("同名のタグが既にあります");

  const tag = await prisma.tag.create({
    data: {
      storeId: session.storeId,
      name: data.name,
      ...(data.color ? { color: data.color } : {}),
    },
  });
  return NextResponse.json(tag);
}
