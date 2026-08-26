import { describe, expect, it } from "vitest";
import type { BusinessHours } from "@/lib/constants";
import { fromJst } from "@/lib/jst";
import { getAvailableSlots, type SlotOptions, type SlotReservation } from "@/lib/slots";

// 2026-08-26 は水曜日 / 2026-08-30 は日曜日
const WED = "2026-08-26";
const SUN = "2026-08-30";

const hours: BusinessHours = {
  mon: { open: "10:00", close: "19:00", closed: false },
  tue: { open: "10:00", close: "19:00", closed: false },
  wed: { open: "10:00", close: "19:00", closed: false },
  thu: { open: "10:00", close: "19:00", closed: false },
  fri: { open: "10:00", close: "19:00", closed: false },
  sat: { open: "09:00", close: "18:00", closed: false },
  sun: { open: "09:00", close: "18:00", closed: true },
};

function reservation(ymd: string, startHm: string, endHm: string, staffId: string | null): SlotReservation {
  return { startAt: fromJst(ymd, startHm), endAt: fromJst(ymd, endHm), staffId };
}

function baseOpts(overrides: Partial<SlotOptions> = {}): SlotOptions {
  return {
    businessHours: hours,
    slotIntervalMin: 30,
    durationMin: 60,
    dateYmd: WED,
    reservations: [],
    staffCount: 2,
    ...overrides,
  };
}

describe("getAvailableSlots: 営業時間と枠生成", () => {
  it("通常営業日は開店から (閉店 - 施術時間) まで間隔ごとに枠が並ぶ", () => {
    const slots = getAvailableSlots(baseOpts());
    // 10:00〜18:00 の30分刻み = 17枠
    expect(slots).toHaveLength(17);
    expect(slots[0]).toBe("10:00");
    expect(slots[slots.length - 1]).toBe("18:00");
  });

  it("閉店時刻を超える枠は生成されない（close - duration が上限）", () => {
    const slots = getAvailableSlots(baseOpts());
    expect(slots).not.toContain("18:30");
    // 施術時間が長い場合は上限が前倒しされる
    const long = getAvailableSlots(baseOpts({ durationMin: 120 }));
    expect(long[long.length - 1]).toBe("17:00");
    expect(long).not.toContain("17:30");
  });

  it("定休日は空配列", () => {
    expect(getAvailableSlots(baseOpts({ dateYmd: SUN }))).toEqual([]);
  });

  it("開店・閉店時刻が不正（close <= open）なら空配列", () => {
    const broken: BusinessHours = {
      ...hours,
      wed: { open: "19:00", close: "10:00", closed: false },
    };
    expect(getAvailableSlots(baseOpts({ businessHours: broken }))).toEqual([]);
  });
});

describe("getAvailableSlots: 指名ありの重複除外", () => {
  it("指名スタッフの既存予約と重なる枠は除外される", () => {
    const slots = getAvailableSlots(
      baseOpts({
        staffId: "staff-a",
        reservations: [reservation(WED, "11:00", "12:00", "staff-a")],
      })
    );
    // 施術60分なので 10:30〜11:30 開始はいずれも 11:00-12:00 と重なる
    expect(slots).not.toContain("10:30");
    expect(slots).not.toContain("11:00");
    expect(slots).not.toContain("11:30");
    // 端はぴったり接する場合は重複ではない
    expect(slots).toContain("10:00");
    expect(slots).toContain("12:00");
  });

  it("別スタッフの予約はキャパに余裕があれば影響しない", () => {
    const slots = getAvailableSlots(
      baseOpts({
        staffId: "staff-a",
        staffCount: 2,
        reservations: [reservation(WED, "11:00", "12:00", "staff-b")],
      })
    );
    expect(slots).toContain("11:00");
  });

  it("指名スタッフが空いていても全体キャパが埋まっていれば除外される", () => {
    // スタッフ2名: staff-b と担当未定の予約で 11:00-12:00 のキャパ2が埋まる
    const slots = getAvailableSlots(
      baseOpts({
        staffId: "staff-a",
        staffCount: 2,
        reservations: [
          reservation(WED, "11:00", "12:00", "staff-b"),
          reservation(WED, "11:00", "12:00", null),
        ],
      })
    );
    expect(slots).not.toContain("11:00");
  });
});

describe("getAvailableSlots: 指名なしのキャパシティ", () => {
  it("重複予約数がスタッフ数未満なら枠は残る", () => {
    const slots = getAvailableSlots(
      baseOpts({
        staffCount: 2,
        reservations: [reservation(WED, "11:00", "12:00", "staff-a")],
      })
    );
    expect(slots).toContain("11:00");
  });

  it("重複予約数がスタッフ数に達した枠は除外される", () => {
    const slots = getAvailableSlots(
      baseOpts({
        staffCount: 2,
        reservations: [
          reservation(WED, "11:00", "12:00", "staff-a"),
          reservation(WED, "11:00", "12:00", "staff-b"),
        ],
      })
    );
    expect(slots).not.toContain("10:30");
    expect(slots).not.toContain("11:00");
    expect(slots).not.toContain("11:30");
    expect(slots).toContain("10:00");
    expect(slots).toContain("12:00");
  });

  it("担当未定（staffId=null）の予約もキャパを消費する", () => {
    const slots = getAvailableSlots(
      baseOpts({
        staffCount: 1,
        reservations: [reservation(WED, "11:00", "12:00", null)],
      })
    );
    expect(slots).not.toContain("11:00");
  });

  it("スタッフ0名は店舗キャパ1として扱う", () => {
    const slots = getAvailableSlots(
      baseOpts({
        staffCount: 0,
        reservations: [reservation(WED, "11:00", "12:00", null)],
      })
    );
    expect(slots).not.toContain("11:00");
    expect(slots).toContain("12:00");
  });
});

describe("getAvailableSlots: leadTime による過去枠除外", () => {
  it("現在時刻 + leadTimeMin より前の枠は除外される", () => {
    const slots = getAvailableSlots(
      baseOpts({
        now: fromJst(WED, "12:00"),
        leadTimeMin: 30,
      })
    );
    expect(slots).not.toContain("12:00");
    // ちょうど now + leadTime の枠は予約可能
    expect(slots[0]).toBe("12:30");
  });

  it("leadTimeMin 未指定時はデフォルト30分", () => {
    const slots = getAvailableSlots(baseOpts({ now: fromJst(WED, "10:15") }));
    expect(slots).not.toContain("10:00");
    expect(slots).not.toContain("10:30");
    expect(slots[0]).toBe("11:00");
  });

  it("now 未指定なら過去枠の除外は行われない", () => {
    const slots = getAvailableSlots(baseOpts());
    expect(slots[0]).toBe("10:00");
  });

  it("営業終了間際に now があると枠が無くなる", () => {
    const slots = getAvailableSlots(
      baseOpts({ now: fromJst(WED, "18:00"), leadTimeMin: 30 })
    );
    expect(slots).toEqual([]);
  });
});
