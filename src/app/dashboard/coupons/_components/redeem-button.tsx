"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** 発行履歴の「使用済みにする」「取り消す」ボタン */
export function RedeemButton({
  issueId,
  action,
}: {
  issueId: string;
  action: "redeem" | "unredeem";
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const res = await fetch(`/api/coupons/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "更新に失敗しました");
        return;
      }
      toast.success(action === "redeem" ? "使用済みにしました" : "未使用に戻しました");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (action === "unredeem") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={pending}
        className="text-gray-500"
      >
        <RotateCcw />
        {pending ? "処理中…" : "取り消す"}
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      <CheckCircle2 />
      {pending ? "処理中…" : "使用済みにする"}
    </Button>
  );
}
