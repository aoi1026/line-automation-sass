"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const DEMO_EMAIL = "demo@repinavi.jp";
const DEMO_PASSWORD = "demo1234";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setErrorMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMessage(data.error ?? "ログインに失敗しました");
        return;
      }
      toast.success("ログインしました");
      router.push(next);
      router.refresh();
    } catch {
      setErrorMessage("通信に失敗しました。時間をおいて再度お試しください");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">パスワード</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {errorMessage ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Spinner className="h-4 w-4 text-white" />
            ログイン中...
          </>
        ) : (
          "ログイン"
        )}
      </Button>

      <button
        type="button"
        onClick={() => {
          setEmail(DEMO_EMAIL);
          setPassword(DEMO_PASSWORD);
        }}
        className="w-full rounded-lg border border-dashed border-brand/40 bg-brand-light/60 px-3 py-3 text-left transition-colors hover:bg-brand-light"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-dark">
          <Sparkles className="h-3.5 w-3.5 text-brand" />
          デモアカウントでお試しいただけます
        </span>
        <span className="mt-1 block text-xs text-gray-600">
          {DEMO_EMAIL} / {DEMO_PASSWORD}（タップで自動入力されます）
        </span>
      </button>
    </form>
  );
}
