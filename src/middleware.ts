import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE } from "@/lib/session";

/**
 * ダッシュボード配下のレスポンスに付与する追加ヘッダ。
 * 共通のセキュリティヘッダは next.config.ts で全パスに設定済み。
 * ここではログイン後の画面に固有の保護のみを追加する。
 */
function applyPrivateHeaders(res: NextResponse): NextResponse {
  // 検索エンジンにインデックスさせない（顧客情報を含む画面のため）
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  // ブラウザや中間プロキシにキャッシュさせない
  // （ログアウト後に戻るボタンで前の利用者のデータが表示されるのを防ぐ）
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  return res;
}

/** ダッシュボード配下はログイン必須 */
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return applyPrivateHeaders(NextResponse.redirect(loginUrl));
  }
  return applyPrivateHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
