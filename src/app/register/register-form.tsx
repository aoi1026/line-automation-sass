"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

export function RegisterForm() {
  const router = useRouter();
  const [storeName, setStoreName] = React.useState("");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    if (password.length < 8) {
      setErrorMessage("パスワードは8文字以上で入力してください");
      return;
    }
    setErrorMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName, name, email, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErrorMessage(data.error ?? "登録に失敗しました");
        return;
      }
      toast.success("店舗の登録が完了しました");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage("通信に失敗しました。時間をおいて再度お試しください");
    } finally {
      setLoading(false);
    }
  }

  const hasError = errorMessage !== "";
  const passwordTooShort = hasError && password.length < 8;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="storeName">店舗名</Label>
        <Input
          id="storeName"
          name="storeName"
          type="text"
          autoComplete="organization"
          placeholder="例: hair salon Lino 表参道店"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          required
          maxLength={100}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">お名前</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="例: 山田 花子"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={50}
        />
      </div>

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
            autoComplete="new-password"
            placeholder="8文字以上"
            className="pr-12"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={passwordTooShort || undefined}
            aria-describedby={
              passwordTooShort ? "register-password-hint register-error" : "register-password-hint"
            }
            required
            minLength={8}
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
        <p id="register-password-hint" className="text-xs leading-relaxed text-gray-500">
          8文字以上で設定してください。
        </p>
      </div>

      {hasError ? (
        <p
          id="register-error"
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
            登録中…
          </>
        ) : (
          "無料で登録"
        )}
      </Button>

      <p className="text-center text-xs leading-relaxed text-gray-500">
        クレジットカードの登録は不要です。登録後すぐにデモデータでお試しいただけます。
      </p>
    </form>
  );
}
