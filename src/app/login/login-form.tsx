"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Sparkles } from "lucide-react";
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
  const [showPassword, setShowPassword] = React.useState(false);
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

  const hasError = errorMessage !== "";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "login-error" : undefined}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">パスワード</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-12"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? "login-error" : undefined}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "パスワードを非表示にする" : "パスワードを表示する"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-gray-400 transition-colors hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Eye aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {hasError ? (
        <p
          id="login-error"
          role="alert"
          className="rounded-lg bg-red-50 px-3 py-2 text-sm leading-relaxed text-red-600"
        >
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Spinner className="h-4 w-4 text-white" />
            ログイン中…
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
        aria-label="デモアカウントのメールアドレスとパスワードを自動入力する"
        className="w-full rounded-lg border border-dashed border-brand/40 bg-brand-light/60 px-3 py-3 text-left transition-colors hover:bg-brand-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-dark">
          <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-brand" />
          デモアカウントでお試しいただけます
        </span>
        <span className="mt-1 block break-all text-xs leading-relaxed text-gray-600">
          {DEMO_EMAIL} / {DEMO_PASSWORD}（タップで自動入力されます）
        </span>
      </button>
    </form>
  );
}
