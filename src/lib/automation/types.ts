import type { MessageLog } from "@prisma/client";

export type KindCounts = { sent: number; skipped: number; failed: number };

export function emptyCounts(): KindCounts {
  return { sent: 0, skipped: 0, failed: 0 };
}

export function tally(counts: KindCounts, log: MessageLog | null): void {
  if (!log) return;
  if (log.status === "SENT") counts.sent++;
  else if (log.status === "SKIPPED") counts.skipped++;
  else counts.failed++;
}

export function mergeCounts(a: KindCounts, b: KindCounts): KindCounts {
  return { sent: a.sent + b.sent, skipped: a.skipped + b.skipped, failed: a.failed + b.failed };
}
