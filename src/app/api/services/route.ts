import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getApiSession, parseBody, unauthorized } from "@/lib/api";

const createServiceSchema = z.object({
  name: z.string().trim().min(1, "メニュー名を入力してください").max(100),
  category: z.string().trim().max(50).default(""),
  description: z.string().max(1000).default(""),
  durationMin: z
    .number({ invalid_type_error: "所要時間は数値で入力してください" })
    .int("所要時間は整数で入力してください")
    .min(5, "所要時間は5分以上で入力してください")
    .max(600, "所要時間は600分以内で入力してください")
    .default(60),
  price: z
    .number({ invalid_type_error: "価格は数値で入力してください" })
    .int("価格は整数で入力してください")
    .min(0, "価格は0円以上で入力してください")
    .max(10000000, "価格が大きすぎます")
    .default(0),
  repeatIntervalDays: z
    .number({ invalid_type_error: "推奨再来店間隔は数値で入力してください" })
    .int("推奨再来店間隔は整数で入力してください")
    .min(1, "推奨再来店間隔は1日以上で入力してください")
    .max(365, "推奨再来店間隔は365日以内で入力してください")
    .nullable()
    .default(null),
  sortOrder: z
    .number({ invalid_type_error: "表示順は数値で入力してください" })
    .int("表示順は整数で入力してください")
    .min(0)
    .max(9999)
    .default(0),
});

/** メニュー一覧 */
export async function GET() {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const services = await prisma.service.findMany({
    where: { storeId: session.storeId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(services);
}

/** メニューを新規作成 */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, createServiceSchema);
  if (error) return error;

  const service = await prisma.service.create({
    data: {
      storeId: session.storeId,
      name: data.name,
      category: data.category,
      description: data.description,
      durationMin: data.durationMin,
      price: data.price,
      repeatIntervalDays: data.repeatIntervalDays,
      sortOrder: data.sortOrder,
    },
  });
  return NextResponse.json(service);
}
