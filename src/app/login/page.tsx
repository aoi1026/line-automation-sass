import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircleHeart } from "lucide-react";
import { getSession } from "@/lib/session";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "ログイン" };

/** オープンリダイレクト防止: ダッシュボード配下のみ許可 */
function sanitizeNext(next: string | undefined): string {
  if (next && next.startsWith("/dashboard")) return next;
  return "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-light via-white to-gray-50 px-4 py-12">
      <h1 className="sr-only">リピナビ ログイン</h1>

      <div className="mb-8 flex flex-col items-center gap-2">
        <Link
          href="/"
          aria-label="リピナビ トップページへ"
          className="flex items-center gap-2 rounded-lg px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          <MessageCircleHeart aria-hidden="true" className="h-9 w-9 shrink-0 text-brand" />
          <span className="text-3xl font-bold tracking-tight text-gray-900">{APP_NAME}</span>
        </Link>
        <p className="text-center text-sm text-gray-500">{APP_TAGLINE}</p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">ログイン</CardTitle>
          <CardDescription>
            メールアドレスとパスワードを入力してログインしてください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={sanitizeNext(next)} />
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-gray-600">
        アカウントをお持ちでない方は{" "}
        <Link href="/register" className="rounded font-medium text-brand-dark underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50">
          新規登録はこちら
        </Link>
      </p>
    </main>
  );
}
