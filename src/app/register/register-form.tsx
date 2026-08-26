"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="storeName">店舗名</Label>
        <Input
          id="storeName"
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
          autoComplete="new-password"
          placeholder="8文字以上"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <p className="text-xs text-gray-500">8文字以上で設定してください。</p>
      </div>

      {errorMessage ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMessage}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Spinner className="h-4 w-4 text-white" />
            登録中...
          </>
        ) : (
          "無料で登録"
        )}
      </Button>
    </form>
  );
}
