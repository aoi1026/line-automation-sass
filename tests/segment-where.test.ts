import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/jst";
import { buildTargetWhere, type SegmentRules } from "@/lib/segments";

/** buildTargetWhere はDB側で絞り込める条件だけを where に変換する純粋関数 */
describe("buildTargetWhere", () => {
  const now = new Date("2026-08-26T01:00:00.000Z");
  const storeId = "store-1";

  it("条件が空なら店舗スコープだけになる", () => {
    expect(buildTargetWhere(storeId, {}, now)).toEqual({ storeId });
  });

  it("店舗スコープは常に含まれる", () => {
    const where = buildTargetWhere(storeId, { visitCountMin: 1 }, now);
    expect(where.storeId).toBe(storeId);
  });

  it("最終来店の経過日数を日時条件に変換する", () => {
    expect(buildTargetWhere(storeId, { lastVisitDaysMin: 60 }, now).AND).toEqual([
      { lastVisitAt: { lte: addDays(now, -60) } },
    ]);
    expect(buildTargetWhere(storeId, { lastVisitDaysMax: 30 }, now).AND).toEqual([
      { lastVisitAt: { gte: addDays(now, -30) } },
    ]);
  });

  it("来店回数・累計利用額・性別を条件に変換する", () => {
    const rules: SegmentRules = {
      visitCountMin: 2,
      visitCountMax: 5,
      totalSpentMin: 10000,
      gender: "female",
    };
    expect(buildTargetWhere(storeId, rules, now).AND).toEqual([
      { visitCount: { gte: 2 } },
      { visitCount: { lte: 5 } },
      { totalSpent: { gte: 10000 } },
      { gender: "female" },
    ]);
  });

  it("hasLine が true のときだけLINE連携済み条件を付ける", () => {
    expect(buildTargetWhere(storeId, { hasLine: true }, now).AND).toEqual([
      { lineUserId: { not: null } },
    ]);
    expect(buildTargetWhere(storeId, { hasLine: false }, now)).toEqual({ storeId });
  });

  it("タグは指定があるときだけ条件を付ける", () => {
    expect(buildTargetWhere(storeId, { tagIds: ["t1", "t2"] }, now).AND).toEqual([
      { tags: { some: { tagId: { in: ["t1", "t2"] } } } },
    ]);
    expect(buildTargetWhere(storeId, { tagIds: [] }, now)).toEqual({ storeId });
  });

  it("誕生月はJST基準の判定が必要なため where には含めない", () => {
    expect(buildTargetWhere(storeId, { birthdayMonth: 8 }, now)).toEqual({ storeId });
    expect(buildTargetWhere(storeId, { birthdayMonth: 8, visitCountMin: 3 }, now).AND).toEqual([
      { visitCount: { gte: 3 } },
    ]);
  });

  it("0値の条件も条件として扱う（undefined とは区別）", () => {
    expect(buildTargetWhere(storeId, { visitCountMin: 0 }, now).AND).toEqual([
      { visitCount: { gte: 0 } },
    ]);
  });
});
