import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { jsonError, parseBody } from "@/lib/api";
import { createSessionCookie } from "@/lib/session";
import { generateSlug } from "@/lib/utils";
import { DEFAULT_BUSINESS_HOURS, DEFAULT_TEMPLATES } from "@/lib/constants";

const registerSchema = z.object({
  storeName: z.string().trim().min(1, "店舗名を入力してください").max(100, "店舗名が長すぎます"),
  name: z.string().trim().min(1, "お名前を入力してください").max(50, "お名前が長すぎます"),
  email: z
    .string()
    .trim()
    .min(1, "メールアドレスを入力してください")
    .email("メールアドレスの形式が正しくありません"),
  password: z
    .string()
    .min(8, "パスワードは8文字以上で入力してください")
    .max(100, "パスワードが長すぎます"),
});

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, registerSchema);
  if (error) return error;

  const email = data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError("このメールアドレスは既に登録されています", 409);
  }

  // slug 生成（衝突時は再試行）
  let slug = generateSlug(8);
  for (let i = 0; i < 10; i++) {
    const dup = await prisma.store.findUnique({ where: { slug } });
    if (!dup) break;
    slug = generateSlug(8);
  }

  const passwordHash = await hashPassword(data.password);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          name: data.storeName,
          slug,
          businessHours: DEFAULT_BUSINESS_HOURS as unknown as Prisma.InputJsonValue,
        },
      });

      const created = await tx.user.create({
        data: {
          storeId: store.id,
          email,
          passwordHash,
          name: data.name,
          role: "OWNER",
        },
      });

      // デフォルトのメッセージテンプレートを投入
      await tx.messageTemplate.createMany({
        data: DEFAULT_TEMPLATES.map((t) => ({
          storeId: store.id,
          kind: t.kind,
          name: t.name,
          content: t.content,
          enabled: true,
        })),
      });

      return created;
    });

    await createSessionCookie({ userId: user.id, storeId: user.storeId, role: user.role });
    return NextResponse.json({ ok: true });
  } catch (e) {
    // 同時登録などによる一意制約違反
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return jsonError("このメールアドレスは既に登録されています", 409);
    }
    throw e;
  }
}
