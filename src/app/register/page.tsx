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
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "店舗登録" };

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-light via-white to-gray-50 px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <MessageCircleHeart className="h-9 w-9 text-brand" />
          <span className="text-3xl font-bold tracking-tight text-gray-900">{APP_NAME}</span>
        </div>
        <p className="text-sm text-gray-500">{APP_TAGLINE}</p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">店舗登録</CardTitle>
          <CardDescription>
            登録は1分で完了します。LINE未連携でもデモモードですぐにお試しいただけます。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-gray-600">
        すでにアカウントをお持ちの方は{" "}
        <Link href="/login" className="font-medium text-brand-dark hover:underline">
          ログインはこちら
        </Link>
      </p>
    </main>
  );
}
