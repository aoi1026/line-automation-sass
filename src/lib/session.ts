import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "repinavi_session";
const SESSION_DAYS = 30;

export type Session = {
  userId: string;
  storeId: string;
  role: "OWNER" | "STAFF";
};

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET が設定されていません");
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(session: Session): Promise<string> {
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.userId !== "string" || typeof payload.storeId !== "string") return null;
    return {
      userId: payload.userId,
      storeId: payload.storeId,
      role: payload.role === "STAFF" ? "STAFF" : "OWNER",
    };
  } catch {
    return null;
  }
}

/** セッションCookieを設定（Server Action / Route Handler内で使用） */
export async function createSessionCookie(session: Session): Promise<void> {
  const token = await signSessionToken(session);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function destroySessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** 現在のセッションを取得（未ログインなら null） */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** ページ用: 未ログインなら /login にリダイレクト */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
