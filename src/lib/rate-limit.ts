/**
 * インメモリのレート制限（固定ウィンドウ方式）。
 * 単一プロセス前提の簡易実装。複数インスタンス構成では Redis 等への置き換えを推奨。
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

/** 期限切れエントリを掃除（メモリリーク防止） */
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** 制限解除までの秒数（ok=false のとき Retry-After に使う） */
  retryAfterSec: number;
};

/**
 * key 単位でリクエスト数を制限する。
 * @param key    識別子（例: "login:1.2.3.4"）
 * @param limit  ウィンドウ内の最大リクエスト数
 * @param windowMs ウィンドウ長（ミリ秒）
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  bucket.count++;
  if (bucket.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { ok: true, remaining: limit - bucket.count, retryAfterSec: 0 };
}

/** リクエストから発信元IPを推定する */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** テスト用: 全バケットをクリア */
export function resetRateLimits(): void {
  buckets.clear();
  lastSweep = 0;
}
