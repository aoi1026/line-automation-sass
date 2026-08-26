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

/**
 * リクエストから発信元IPを推定する。
 *
 * X-Forwarded-For は「クライアント, プロキシ1, プロキシ2, ...」の順に積まれ、
 * **先頭はクライアントが自由に詐称できる**。先頭を信用するとレート制限は
 * ヘッダーを付け替えるだけで回避できてしまう。
 *
 * リバースプロキシ（nginx の $proxy_add_x_forwarded_for など）は
 * 実際のTCP接続元を末尾に追加するため、信頼できるのは末尾側から数えた値。
 * 自前のプロキシ段数を TRUSTED_PROXY_HOPS で指定する（既定1段）。
 */
export function getClientIp(req: Request): string {
  const hops = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS || 1));
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      // 末尾から hops 段目が、自分のプロキシが観測した実際の接続元
      const idx = Math.max(0, parts.length - hops);
      return parts[idx];
    }
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** テスト用: 全バケットをクリア */
export function resetRateLimits(): void {
  buckets.clear();
  lastSweep = 0;
}
