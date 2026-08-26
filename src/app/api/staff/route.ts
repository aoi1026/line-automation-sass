import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getApiSession, parseBody, unauthorized } from "@/lib/api";

const createStaffSchema = z.object({
  name: z.string().trim().min(1, "スタッフ名を入力してください").max(100),
  title: z.string().trim().max(50).default(""),
  sortOrder: z
    .number({ invalid_type_error: "表示順は数値で入力してください" })
    .int("表示順は整数で入力してください")
    .min(0)
    .max(9999)
    .default(0),
});

/** スタッフ一覧 */
export async function GET() {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const staffMembers = await prisma.staffMember.findMany({
    where: { storeId: session.storeId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(staffMembers);
}

/** スタッフを新規登録 */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, createStaffSchema);
  if (error) return error;

  const staff = await prisma.staffMember.create({
    data: {
      storeId: session.storeId,
      name: data.name,
      title: data.title,
      sortOrder: data.sortOrder,
    },
  });
  return NextResponse.json(staff);
}
