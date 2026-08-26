import { describe, expect, it } from "vitest";
import { describeRules, parseRules, type SegmentRules } from "@/lib/segments";

describe("parseRules", () => {
  it("null / undefined は空条件になる", () => {
    expect(parseRules(null)).toEqual({});
    expect(parseRules(undefined)).toEqual({});
  });

  it("オブジェクト以外の入力は空条件になる", () => {
    expect(parseRules("foo")).toEqual({});
    expect(parseRules(123)).toEqual({});
    expect(parseRules([1, 2])).toEqual({});
  });

  it("不正な値を含む入力は空条件になる", () => {
    expect(parseRules({ lastVisitDaysMin: -1 })).toEqual({});
    expect(parseRules({ visitCountMin: 1.5 })).toEqual({});
    expect(parseRules({ birthdayMonth: 13 })).toEqual({});
    expect(parseRules({ birthdayMonth: 0 })).toEqual({});
    expect(parseRules({ gender: "unknown" })).toEqual({});
    expect(parseRules({ lastVisitDaysMin: "60" })).toEqual({});
  });

  it("正しい条件はそのまま通る", () => {
    const rules = {
      lastVisitDaysMin: 60,
      visitCountMax: 3,
      totalSpentMin: 10000,
      tagIds: ["t1", "t2"],
      birthdayMonth: 8,
      gender: "female" as const,
      hasLine: true,
    };
    expect(parseRules(rules)).toEqual(rules);
  });

  it("未知のキーは取り除かれる", () => {
    expect(parseRules({ unknownKey: 1 })).toEqual({});
    expect(parseRules({ visitCountMin: 2, unknownKey: 1 })).toEqual({ visitCountMin: 2 });
  });
});

describe("describeRules", () => {
  it("条件が空なら「全顧客」", () => {
    expect(describeRules({})).toBe("全顧客");
  });

  it("最終来店の経過日数条件を日本語化する", () => {
    expect(describeRules({ lastVisitDaysMin: 60 })).toBe("最終来店から60日以上");
    expect(describeRules({ lastVisitDaysMax: 30 })).toBe("最終来店から30日以内");
  });

  it("来店回数条件を日本語化する", () => {
    expect(describeRules({ visitCountMin: 3 })).toBe("来店回数3回以上");
    expect(describeRules({ visitCountMax: 1 })).toBe("来店回数1回以下");
  });

  it("累計利用額は桁区切りで表示される", () => {
    expect(describeRules({ totalSpentMin: 10000 })).toBe("累計利用額10,000円以上");
  });

  it("タグ名が渡された場合はタグ名を列挙する", () => {
    expect(describeRules({ tagIds: ["t1", "t2"] }, ["VIP", "常連"])).toBe("タグ: VIP・常連");
  });

  it("タグ名が無い場合は件数表示になる", () => {
    expect(describeRules({ tagIds: ["t1", "t2"] })).toBe("タグ2件");
    expect(describeRules({ tagIds: ["t1", "t2"] }, [])).toBe("タグ2件");
  });

  it("誕生月・性別・LINE連携を日本語化する", () => {
    expect(describeRules({ birthdayMonth: 8 })).toBe("8月生まれ");
    expect(describeRules({ gender: "female" })).toBe("女性");
    expect(describeRules({ gender: "male" })).toBe("男性");
    expect(describeRules({ hasLine: true })).toBe("LINE連携済み");
  });

  it("hasLine が false のときは表示しない", () => {
    expect(describeRules({ hasLine: false })).toBe("全顧客");
  });

  it("複数条件は「 / 」で連結される", () => {
    const rules: SegmentRules = {
      lastVisitDaysMin: 60,
      visitCountMin: 2,
      gender: "female",
    };
    expect(describeRules(rules)).toBe("最終来店から60日以上 / 来店回数2回以上 / 女性");
  });

  it("0値の条件も表示される（undefined とは区別）", () => {
    expect(describeRules({ lastVisitDaysMin: 0 })).toBe("最終来店から0日以上");
    expect(describeRules({ visitCountMin: 0 })).toBe("来店回数0回以上");
  });
});
