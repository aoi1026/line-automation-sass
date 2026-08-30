import { describe, expect, it } from "vitest";
import { birthdayCandidateMonthDays } from "@/lib/automation/birthday";
import { fromJst } from "@/lib/jst";

/**
 * 誕生日配信で「今日が誕生日になりうる顧客」をDB側で絞り込むための月日リスト。
 * UTC保存とJST判定のずれを吸収するため、前日・当日・翌日の3件を返す。
 */
describe("birthdayCandidateMonthDays", () => {
  it("JSTの前日・当日・翌日の月日を返す", () => {
    expect(birthdayCandidateMonthDays(fromJst("2026-08-26", "10:00"))).toEqual([
      "08-25",
      "08-26",
      "08-27",
    ]);
  });

  it("月をまたぐ日でも正しい月日になる", () => {
    expect(birthdayCandidateMonthDays(fromJst("2026-04-01", "10:00"))).toEqual([
      "03-31",
      "04-01",
      "04-02",
    ]);
    expect(birthdayCandidateMonthDays(fromJst("2026-04-30", "10:00"))).toEqual([
      "04-29",
      "04-30",
      "05-01",
    ]);
  });

  it("年をまたぐ日でも正しい月日になる", () => {
    expect(birthdayCandidateMonthDays(fromJst("2026-01-01", "00:30"))).toEqual([
      "12-31",
      "01-01",
      "01-02",
    ]);
    expect(birthdayCandidateMonthDays(fromJst("2026-12-31", "23:30"))).toEqual([
      "12-30",
      "12-31",
      "01-01",
    ]);
  });

  it("平年の3月1日でも2月29日を候補に含める（閏日生まれの取りこぼし防止）", () => {
    expect(birthdayCandidateMonthDays(fromJst("2026-03-01", "10:00"))).toEqual([
      "02-29",
      "03-01",
      "03-02",
    ]);
  });

  it("閏日当日は2月29日を含む3日分を返す", () => {
    expect(birthdayCandidateMonthDays(fromJst("2024-02-29", "10:00"))).toEqual([
      "02-28",
      "02-29",
      "03-01",
    ]);
  });

  it("UTCでは前日でもJSTの日付で判定する", () => {
    // 2026-08-26T15:00Z は JST 2026-08-27 00:00
    expect(birthdayCandidateMonthDays(new Date("2026-08-26T15:00:00.000Z"))).toEqual([
      "08-26",
      "08-27",
      "08-28",
    ]);
  });
});
