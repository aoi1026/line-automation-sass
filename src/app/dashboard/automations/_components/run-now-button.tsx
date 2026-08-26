"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type KindCounts = { sent: number; skipped: number; failed: number };
type RunResponse = {
  results?: Record<string, KindCounts>;
  error?: string;
};

/** 自店舗の自動配信を今すぐ実行するボタン */
export function RunNowButton() {
  const router = useRouter();
  const [running, setRunning] = React.useState(false);

  async function handleRun() {
    setRunning(true);
    try {
      const res = await fetch("/api/automations/run", { method: "POST" });
      const data = (await res.json().catch(() => null)) as RunResponse | null;
      if (!res.ok || !data) {
        toast.error(data?.error ?? "自動配信の実行に失敗しました");
        return;
      }
      let sent = 0;
      let skipped = 0;
      let failed = 0;
      for (const counts of Object.values(data.results ?? {})) {
        sent += counts.sent;
        skipped += counts.skipped;
        failed += counts.failed;
      }
      toast.success(
        `自動配信を実行しました（送信${sent}件・スキップ${skipped}件${failed > 0 ? `・失敗${failed}件` : ""}）`
      );
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  return (
    <Button
      onClick={handleRun}
      disabled={running}
      title="予約リマインドや再来店リマインドなど、送信対象のメッセージをすぐに送信します"
    >
      {running ? (
        <Spinner className="text-white" aria-hidden="true" />
      ) : (
        <Play aria-hidden="true" />
      )}
      {running ? "実行中…" : "今すぐ実行"}
    </Button>
  );
}
