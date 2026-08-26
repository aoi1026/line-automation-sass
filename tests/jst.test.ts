import { describe, expect, it } from "vitest";
import {
  addDays,
  addHours,
  addMinutes,
  formatJstDate,
  formatJstDateTime,
  fromJst,
  isJstBirthdayToday,
  isSameJstDay,
  jstDayKey,
  jstDaysBetween,
  jstHm,
  jstStartOfDay,
  jstYmd,
} from "@/lib/jst";

describe("jstYmd / jstHm", () => {
  it("UTC/JST日付境界をまたぐ場合、JST側の日付・時刻を返す", () => {
    // 2026-08-25T15:30:00Z = JST 2026-08-26 00:30
    const d = new Date("2026-08-25T15:30:00Z");
    expect(jstYmd(d)).toBe("2026-08-26");
    expect(jstHm(d)).toBe("00:30");
  });

  it("境界の直前はまだ前日のまま", () => {
    // 2026-08-25T14:59:00Z = JST 2026-08-25 23:59
    const d = new Date("2026-08-25T14:59:00Z");
    expect(jstYmd(d)).toBe("2026-08-25");
    expect(jstHm(d)).toBe("23:59");
  });

  it("ゼロ埋めされたフォーマットになる", () => {
    const d = new Date("2026-01-05T00:05:00+09:00");
    expect(jstYmd(d)).toBe("2026-01-05");
    expect(jstHm(d)).toBe("00:05");
  });
});

describe("fromJst", () => {
  it("YMD + HM のラウンドトリップが一致する", () => {
    const d = fromJst("2026-08-26", "14:30");
    expect(jstYmd(d)).toBe("2026-08-26");
    expect(jstHm(d)).toBe("14:30");
  });

  it("時刻省略時は 00:00 になる", () => {
    const d = fromJst("2026-08-26");
    expect(jstHm(d)).toBe("00:00");
  });

  it("JSTの+09:00オフセットで解釈される（UTC換算が正しい）", () => {
    const d = fromJst("2026-08-26", "00:00");
    expect(d.toISOString()).toBe("2026-08-25T15:00:00.000Z");
  });
});

describe("jstStartOfDay", () => {
  it("その日のJST 00:00を返す（日付をまたいでも正しいJST日で丸められる）", () => {
    // 2026-08-26T15:00:00Z = JST 2026-08-27 00:00 -> その日の開始は同じ瞬間
    const d = new Date("2026-08-26T15:00:00Z");
    const start = jstStartOfDay(d);
    expect(start.toISOString()).toBe("2026-08-26T15:00:00.000Z");
    expect(jstYmd(start)).toBe("2026-08-27");
    expect(jstHm(start)).toBe("00:00");
  });

  it("同日の別時刻からも同じ開始時刻になる", () => {
    const a = jstStartOfDay(fromJst("2026-08-26", "09:00"));
    const b = jstStartOfDay(fromJst("2026-08-26", "23:59"));
    expect(a.getTime()).toBe(b.getTime());
  });
});

describe("jstDayKey", () => {
  it("既知の日付から正しい曜日キーを返す（2026-08-26は水曜）", () => {
    expect(jstDayKey(fromJst("2026-08-26", "10:00"))).toBe("wed");
  });

  it("日曜日を正しく判定する", () => {
    expect(jstDayKey(fromJst("2026-08-23", "10:00"))).toBe("sun");
  });

  it("土曜日を正しく判定する", () => {
    expect(jstDayKey(fromJst("2026-08-29", "10:00"))).toBe("sat");
  });
});

describe("isSameJstDay", () => {
  it("同じJST日なら true", () => {
    const a = new Date("2026-08-25T15:30:00Z"); // JST 8/26 00:30
    const b = new Date("2026-08-26T14:59:00Z"); // JST 8/26 23:59
    expect(isSameJstDay(a, b)).toBe(true);
  });

  it("JST境界をまたぐと false になる", () => {
    const a = new Date("2026-08-25T14:59:00Z"); // JST 8/25 23:59
    const b = new Date("2026-08-25T15:00:00Z"); // JST 8/26 00:00
    expect(isSameJstDay(a, b)).toBe(false);
  });
});

describe("jstDaysBetween", () => {
  it("昨日から今日は1", () => {
    const from = fromJst("2026-08-25", "00:00");
    const to = fromJst("2026-08-26", "00:00");
    expect(jstDaysBetween(from, to)).toBe(1);
  });

  it("同じ日なら0（時刻が違っても）", () => {
    const from = fromJst("2026-08-26", "01:00");
    const to = fromJst("2026-08-26", "23:00");
    expect(jstDaysBetween(from, to)).toBe(0);
  });

  it("月をまたぐ日数計算", () => {
    const from = fromJst("2026-07-30", "00:00");
    const to = fromJst("2026-08-02", "00:00");
    expect(jstDaysBetween(from, to)).toBe(3);
  });

  it("過去方向は負の値になる", () => {
    const from = fromJst("2026-08-26", "00:00");
    const to = fromJst("2026-08-25", "00:00");
    expect(jstDaysBetween(from, to)).toBe(-1);
  });
});

describe("addDays / addHours / addMinutes", () => {
  it("addDaysは24時間単位で加算する", () => {
    const d = new Date("2026-08-26T00:00:00Z");
    expect(addDays(d, 1).getTime()).toBe(d.getTime() + 86400000);
    expect(addDays(d, -1).getTime()).toBe(d.getTime() - 86400000);
  });

  it("addHoursは1時間単位で加算する", () => {
    const d = new Date("2026-08-26T00:00:00Z");
    expect(addHours(d, 3).getTime()).toBe(d.getTime() + 3 * 3600000);
  });

  it("addMinutesは1分単位で加算する", () => {
    const d = new Date("2026-08-26T00:00:00Z");
    expect(addMinutes(d, 90).getTime()).toBe(d.getTime() + 90 * 60000);
  });

  it("addDaysは月をまたいでも正しい", () => {
    const d = fromJst("2026-08-31", "00:00");
    expect(jstYmd(addDays(d, 1))).toBe("2026-09-01");
  });
});

describe("formatJstDate / formatJstDateTime", () => {
  it("formatJstDateは「YYYY年M月D日(曜)」形式", () => {
    const d = fromJst("2026-08-26", "14:30");
    expect(formatJstDate(d)).toBe("2026年8月26日(水)");
  });

  it("formatJstDateTimeは日付+時刻を結合する", () => {
    const d = fromJst("2026-08-26", "14:30");
    expect(formatJstDateTime(d)).toBe("2026年8月26日(水) 14:30");
  });

  it("時刻0埋めも正しく整形される", () => {
    const d = fromJst("2026-01-05", "09:05");
    expect(formatJstDateTime(d)).toBe("2026年1月5日(月) 09:05");
  });
});

describe("isJstBirthdayToday", () => {
  it("年が違っても月日が一致すればtrue", () => {
    const birthday = fromJst("1990-08-26", "01:00");
    const now = fromJst("2026-08-26", "20:00");
    expect(isJstBirthdayToday(birthday, now)).toBe(true);
  });

  it("月日が一致しなければfalse", () => {
    const birthday = fromJst("1990-08-27", "01:00");
    const now = fromJst("2026-08-26", "20:00");
    expect(isJstBirthdayToday(birthday, now)).toBe(false);
  });

  it("UTC上の日付がずれていてもJST変換後の月日が一致すればtrue", () => {
    // UTC上は 8/25 だが JST では 8/26 になる誕生日
    const birthday = new Date("1990-08-25T16:00:00Z");
    // UTC上は 8/26 のまま JST でも 8/26 の「今日」
    const now = new Date("2026-08-26T10:00:00Z");
    expect(isJstBirthdayToday(birthday, now)).toBe(true);
  });

  it("UTC上の日付は一致していてもJST変換後に月日がずれればfalse", () => {
    // UTC上は 8/26 だが JST では 8/27 になる誕生日
    const birthday = new Date("1990-08-26T20:00:00Z");
    // JST では 8/26 の「今日」
    const now = new Date("2026-08-26T10:00:00Z");
    expect(isJstBirthdayToday(birthday, now)).toBe(false);
  });
});
