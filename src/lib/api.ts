import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, type Session } from "@/lib/session";

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized(): NextResponse {
  return jsonError("認証が必要です", 401);
}

export function notFound(message = "見つかりませんでした"): NextResponse {
  return jsonError(message, 404);
}

export function serverError(message = "サーバーエラーが発生しました"): NextResponse {
  return jsonError(message, 500);
}

/** APIルート用セッション取得。null の場合は unauthorized() を返すこと */
export async function getApiSession(): Promise<Session | null> {
  return getSession();
}

/**
 * リクエストボディをzodでパース。
 * 失敗時は { error: NextResponse } を返すので、そのまま return error する。
 */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { data: null, error: jsonError("リクエストボディが不正です") };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first.path.join(".");
    return {
      data: null,
      error: jsonError(path ? `${path}: ${first.message}` : first.message),
    };
  }
  return { data: result.data, error: null };
}
