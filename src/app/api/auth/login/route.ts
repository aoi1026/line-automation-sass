import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { jsonError, parseBody } from "@/lib/api";
import { createSessionCookie } from "@/lib/session";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "メールアドレスを入力してください")
    .email("メールアドレスの形式が正しくありません"),
  password: z.string().min(1, "パスワードを入力してください"),
});

const INVALID_CREDENTIALS = "メールアドレスまたはパスワードが正しくありません";

export async function POST(req: Request) {
  const { data, error } = await parseBody(req, loginSchema);
  if (error) return error;

  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });
  if (!user) return jsonError(INVALID_CREDENTIALS, 401);

  const valid = await verifyPassword(data.password, user.passwordHash);
  if (!valid) return jsonError(INVALID_CREDENTIALS, 401);

  await createSessionCookie({ userId: user.id, storeId: user.storeId, role: user.role });
  return NextResponse.json({ ok: true });
}
