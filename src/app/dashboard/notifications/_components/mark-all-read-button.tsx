"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** 未読の通知をまとめて既読にする */
export function MarkAllReadButton({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);

  async function handleClick() {
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) {
        toast.error("既読にできませんでした");
        return;
      }
      toast.success("すべて既読にしました");
      router.refresh();
    } catch {
      toast.error("既読にできませんでした");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button
      variant="outline"
      onClick={() => void handleClick()}
      disabled={saving || unreadCount === 0}
    >
      <CheckCheck />
      すべて既読にする
    </Button>
  );
}
