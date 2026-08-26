import { describe, expect, it } from "vitest";
import {
  cn,
  formatNumber,
  formatPercent,
  formatYen,
  generateLinkCode,
  generateSlug,
} from "@/lib/utils";

describe("formatYen", () => {
  it("0円", () => {
    expect(formatYen(0)).toBe("¥0");
  });

  it("4桁の金額に3桁区切りカンマが入る", () => {
    expect(formatYen(4950)).toBe("¥4,950");
  });

  it("大きな金額も正しく区切られる", () => {
    expect(formatYen(1234567)).toBe("¥1,234,567");
  });
});

describe("formatNumber", () => {
  it("0", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("3桁区切りカンマが入る", () => {
    expect(formatNumber(4950)).toBe("4,950");
  });

  it("大きな数値も正しく区切られる", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });
});

describe("formatPercent", () => {
  it("0.375 -> 37.5%", () => {
    expect(formatPercent(0.375)).toBe("37.5%");
  });

  it("0 -> 0.0%", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("1 -> 100.0%", () => {
    expect(formatPercent(1)).toBe("100.0%");
  });
});

describe("generateLinkCode", () => {
  it("6桁の数字文字列を生成する", () => {
    const code = generateLinkCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("100000〜999999の範囲に収まる", () => {
    for (let i = 0; i < 50; i++) {
      const n = Number(generateLinkCode());
      expect(n).toBeGreaterThanOrEqual(100000);
      expect(n).toBeLessThanOrEqual(999999);
    }
  });
});

describe("generateSlug", () => {
  it("デフォルトは8文字", () => {
    expect(generateSlug()).toHaveLength(8);
  });

  it("指定した長さで生成される", () => {
    expect(generateSlug(12)).toHaveLength(12);
  });

  it("英小文字と数字のみで構成される", () => {
    const slug = generateSlug(50);
    expect(slug).toMatch(/^[a-z0-9]+$/);
  });
});

describe("cn", () => {
  it("複数のクラスをスペース区切りで結合する", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("競合するTailwindクラスは後勝ちでマージされる", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("falsyな値は無視される", () => {
    expect(cn("foo", false && "bar", null, undefined, "baz")).toBe("foo baz");
  });
});
