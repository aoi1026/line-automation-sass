"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

/** 一覧カード上の有効/無効切り替えスイッチ（即PATCH） */
export function CouponActiveSwitch({
  couponId,
  active,
  couponTitle,
}: {
  couponId: string;
  active: boolean;
  /** 読み上げ用のクーポン名（省略時は汎用ラベル） */
  couponTitle?: string;
}) {
  const router = useRouter();
  const [checked, setChecked] = React.useState(active);
  const [pending, setPending] = React.useState(false);

  async function handleChange(next: boolean) {
    setChecked(next);
    setPending(true);
    try {
      const res = await fetch(`/api/coupons/${couponId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setChecked(!next);
        toast.error(data?.error ?? "更新に失敗しました");
        return;
      }
      toast.success(next ? "有効にしました" : "無効にしました");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Switch
      checked={checked}
      onCheckedChange={handleChange}
      disabled={pending}
      aria-label={
        couponTitle
          ? `クーポン「${couponTitle}」を有効にする`
          : "クーポンを有効にする"
      }
    />
  );
}
