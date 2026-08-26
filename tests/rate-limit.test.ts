import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClientIp, rateLimit, resetRateLimits } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("上限内のリクエストは許可され、残り回数が1ずつ減る", () => {
    const first = rateLimit("login:1.2.3.4", 3, 60_000);
    expect(first.ok).toBe(true);
    expect(first.remaining).toBe(2);
    expect(first.retryAfterSec).toBe(0);

    const second = rateLimit("login:1.2.3.4", 3, 60_000);
    expect(second.ok).toBe(true);
    expect(second.remaining).toBe(1);

    const third = rateLimit("login:1.2.3.4", 3, 60_000);
    expect(third.ok).toBe(true);
    expect(third.remaining).toBe(0);
  });

  it("上限を超えると拒否され、待機秒数が返る", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("login:1.2.3.4", 3, 60_000).ok).toBe(true);
    }

    const blocked = rateLimit("login:1.2.3.4", 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("拒否された後もさらに拒否され続ける", () => {
    for (let i = 0; i < 2; i++) rateLimit("register:1.2.3.4", 2, 60_000);
    expect(rateLimit("register:1.2.3.4", 2, 60_000).ok).toBe(false);
    expect(rateLimit("register:1.2.3.4", 2, 60_000).ok).toBe(false);
  });

  it("キーごとに独立してカウントされる", () => {
    for (let i = 0; i < 2; i++) rateLimit("login:1.1.1.1", 2, 60_000);
    expect(rateLimit("login:1.1.1.1", 2, 60_000).ok).toBe(false);

    // 別IP
    const otherIp = rateLimit("login:2.2.2.2", 2, 60_000);
    expect(otherIp.ok).toBe(true);
    expect(otherIp.remaining).toBe(1);

    // 同一IPでも用途（接頭辞）が違えば別枠
    const otherPurpose = rateLimit("booking:1.1.1.1", 2, 60_000);
    expect(otherPurpose.ok).toBe(true);
    expect(otherPurpose.remaining).toBe(1);
  });

  it("limit が異なる用途でもそれぞれの上限が適用される", () => {
    expect(rateLimit("survey:1.2.3.4", 1, 60_000).ok).toBe(true);
    expect(rateLimit("survey:1.2.3.4", 1, 60_000).ok).toBe(false);
  });

  describe("ウィンドウの経過", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      resetRateLimits();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("ウィンドウ経過後はカウントがリセットされる", () => {
      for (let i = 0; i < 2; i++) {
        expect(rateLimit("cancel:1.2.3.4", 2, 60_000).ok).toBe(true);
      }
      expect(rateLimit("cancel:1.2.3.4", 2, 60_000).ok).toBe(false);

      vi.advanceTimersByTime(60_001);

      const afterWindow = rateLimit("cancel:1.2.3.4", 2, 60_000);
      expect(afterWindow.ok).toBe(true);
      expect(afterWindow.remaining).toBe(1);
    });

    it("ウィンドウ内であれば時間が進んでもカウントは維持される", () => {
      for (let i = 0; i < 2; i++) rateLimit("coupon:1.2.3.4", 2, 60_000);

      vi.advanceTimersByTime(30_000);

      expect(rateLimit("coupon:1.2.3.4", 2, 60_000).ok).toBe(false);
    });

    it("待機秒数は残りのウィンドウ長に応じて短くなる", () => {
      rateLimit("line-webhook:store_1", 1, 60_000);
      const blocked = rateLimit("line-webhook:store_1", 1, 60_000);
      expect(blocked.retryAfterSec).toBe(60);

      vi.advanceTimersByTime(50_000);
      const later = rateLimit("line-webhook:store_1", 1, 60_000);
      expect(later.ok).toBe(false);
      expect(later.retryAfterSec).toBe(10);
    });
  });
});

describe("getClientIp", () => {
  it("x-forwarded-for は末尾（自分のプロキシが観測した接続元）を返す", () => {
    // 先頭はクライアントが自由に詐称できるため信用しない。
    // nginx の $proxy_add_x_forwarded_for は実際の接続元を末尾に追加する。
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.9, 70.41.3.18" },
    });
    expect(getClientIp(req)).toBe("70.41.3.18");
  });

  it("偽装した x-forwarded-for を先頭に足してもレート制限を回避できない", () => {
    // 攻撃者が毎回異なるIPを先頭に詐称しても、実際の接続元は変わらないので
    // 同じバケットに集計される
    const ipOf = (spoofed: string) =>
      getClientIp(
        new Request("https://example.com", {
          headers: { "x-forwarded-for": `${spoofed}, 70.41.3.18` },
        })
      );
    expect(ipOf("1.1.1.1")).toBe("70.41.3.18");
    expect(ipOf("2.2.2.2")).toBe("70.41.3.18");
    expect(ipOf("3.3.3.3")).toBe("70.41.3.18");
  });

  it("単一のIPだけならそのIPを返す", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "198.51.100.20" },
    });
    expect(getClientIp(req)).toBe("198.51.100.20");
  });

  it("x-forwarded-for が無ければ x-real-ip を返す", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "198.51.100.7" },
    });
    expect(getClientIp(req)).toBe("198.51.100.7");
  });

  it("どちらのヘッダーも無ければ unknown を返す", () => {
    const req = new Request("https://example.com");
    expect(getClientIp(req)).toBe("unknown");
  });
});
