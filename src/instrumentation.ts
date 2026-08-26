/**
 * Next.js instrumentation hook。
 * AUTOMATION_INTERVAL_MS が設定されている場合、アプリ内で自動配信エンジンを定期実行する。
 * 本番運用では外部cron（例: 毎分 GET /api/cron/run?secret=...）の利用を推奨。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const intervalMs = Number(process.env.AUTOMATION_INTERVAL_MS || 0);
  if (!intervalMs || intervalMs < 10000) return;

  const g = globalThis as unknown as { __repinaviScheduler?: boolean };
  if (g.__repinaviScheduler) return;
  g.__repinaviScheduler = true;

  const { runAutomations } = await import("@/lib/automation/engine");
  console.log(`[automation] アプリ内スケジューラを開始しました（${intervalMs}ms間隔）`);
  setInterval(async () => {
    try {
      await runAutomations();
    } catch (e) {
      console.error("[automation] 定期実行でエラー:", e);
    }
  }, intervalMs);
}
