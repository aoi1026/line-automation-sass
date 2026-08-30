import { describe, expect, it } from "vitest";
import {
  RESERVATION_VIEWS,
  normalizeReservationView,
} from "@/app/dashboard/reservations/_components/types";

describe("normalizeReservationView", () => {
  it("既定は日別", () => {
    expect(normalizeReservationView(undefined)).toBe("day");
    expect(normalizeReservationView("")).toBe("day");
  });

  it("想定外の値は日別に丸める", () => {
    expect(normalizeReservationView("calendar")).toBe("day");
    expect(normalizeReservationView("DAY")).toBe("day");
    expect(normalizeReservationView("../../etc")).toBe("day");
  });

  it("対応している表示単位はそのまま返す", () => {
    for (const view of RESERVATION_VIEWS) {
      expect(normalizeReservationView(view)).toBe(view);
    }
  });

  it("今後の予約（upcoming）を受け付ける", () => {
    // ダッシュボードの「未確定の予約を確認」リンクが使うURLパラメータ
    expect(normalizeReservationView("upcoming")).toBe("upcoming");
  });
});
