import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, parseBody, unauthorized } from "@/lib/api";
import { fromJst } from "@/lib/jst";

const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "氏名を入力してください").max(100),
  kana: z.string().trim().max(100).optional().default(""),
  phone: z.string().trim().max(30).optional().default(""),
  email: z.string().trim().max(200).optional().default(""),
  gender: z.enum(["", "female", "male", "other"]).optional().default(""),
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "誕生日の形式が不正です")
    .nullable()
    .optional(),
  notes: z.string().max(2000).optional().default(""),
});

/** 顧客一覧（?q= 名前/かな/電話 部分一致、?tagId= タグ絞り込み） */
export async function GET(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const tagId = url.searchParams.get("tagId")?.trim() ?? "";

  const where: Prisma.CustomerWhereInput = {
    storeId: session.storeId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { kana: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
    ...(tagId ? { tags: { some: { tagId } } } : {}),
  };

  const customers = await prisma.customer.findMany({
    where,
    include: { tags: { include: { tag: true } } },
    orderBy: [{ lastVisitAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });
  return NextResponse.json(customers);
}

/** 顧客を新規登録 */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, createCustomerSchema);
  if (error) return error;

  const customer = await prisma.customer.create({
    data: {
      storeId: session.storeId,
      name: data.name,
      kana: data.kana,
      phone: data.phone,
      email: data.email,
      gender: data.gender,
      birthday: data.birthday ? fromJst(data.birthday) : null,
      notes: data.notes,
    },
    include: { tags: { include: { tag: true } } },
  });
  return NextResponse.json(customer);
}
