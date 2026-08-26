import type { StaffMember, Store } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { findReservationConflict } from "@/lib/availability";
import { prisma } from "@/lib/db";
import { addDays, fromJst, jstYmd } from "@/lib/jst";
import {
  createCustomer,
  createReservation,
  createStaff,
  createTestStore,
  destroyTestStore,
} from "./helpers";

/** テストごとに別の日を使い、他のテストの予約と干渉させない */
function slotOn(daysFromToday: number, hm: string): Date {
  return fromJst(jstYmd(addDays(new Date(), daysFromToday)), hm);
}

describe("予約の重複判定", () => {
  let store: Store;
  let staffA: StaffMember;
  let staffB: StaffMember;
  let customerId: string;

  beforeAll(async () => {
    // アクティブなスタッフ2名 = 同時受付可能数（キャパシティ）2
    store = await createTestStore();
    staffA = await createStaff(store.id, { name: "担当A" });
    staffB = await createStaff(store.id, { name: "担当B" });
    const customer = await createCustomer(store.id, { name: "重複判定テスト顧客" });
    customerId = customer.id;
  });

  afterAll(async () => {
    await destroyTestStore(store.id);
    await prisma.$disconnect();
  });

  it("同じ担当者の予約が重なる場合は staff を返す", async () => {
    await createReservation(store.id, {
      customerId,
      staffId: staffA.id,
      startAt: slotOn(10, "10:00"),
      endAt: slotOn(10, "11:00"),
      status: "CONFIRMED",
    });

    const conflict = await findReservationConflict({
      storeId: store.id,
      startAt: slotOn(10, "10:30"),
      endAt: slotOn(10, "11:30"),
      staffId: staffA.id,
    });
    expect(conflict).toBe("staff");
  });

  it("受付可能数を超える場合は capacity を返す", async () => {
    for (const staff of [staffA, staffB]) {
      await createReservation(store.id, {
        customerId,
        staffId: staff.id,
        startAt: slotOn(11, "10:00"),
        endAt: slotOn(11, "11:00"),
        status: "CONFIRMED",
      });
    }

    const conflict = await findReservationConflict({
      storeId: store.id,
      startAt: slotOn(11, "10:00"),
      endAt: slotOn(11, "11:00"),
      staffId: null,
    });
    expect(conflict).toBe("capacity");
  });

  it("空きがある場合は null を返す", async () => {
    await createReservation(store.id, {
      customerId,
      staffId: staffA.id,
      startAt: slotOn(12, "10:00"),
      endAt: slotOn(12, "11:00"),
      status: "CONFIRMED",
    });

    // 重ならない時間帯
    await expect(
      findReservationConflict({
        storeId: store.id,
        startAt: slotOn(12, "14:00"),
        endAt: slotOn(12, "15:00"),
        staffId: staffA.id,
      })
    ).resolves.toBeNull();

    // 同じ時間帯でも、まだ空いている担当者なら受け付けられる
    await expect(
      findReservationConflict({
        storeId: store.id,
        startAt: slotOn(12, "10:00"),
        endAt: slotOn(12, "11:00"),
        staffId: staffB.id,
      })
    ).resolves.toBeNull();
  });

  it("前後に隣接するだけの予約は重複とみなさない", async () => {
    await createReservation(store.id, {
      customerId,
      staffId: staffA.id,
      startAt: slotOn(13, "10:00"),
      endAt: slotOn(13, "11:00"),
      status: "CONFIRMED",
    });

    const conflict = await findReservationConflict({
      storeId: store.id,
      startAt: slotOn(13, "11:00"),
      endAt: slotOn(13, "12:00"),
      staffId: staffA.id,
    });
    expect(conflict).toBeNull();
  });

  it("キャンセル済み・来店済みの予約は重複判定に含めない", async () => {
    for (const status of ["CANCELLED", "NO_SHOW"] as const) {
      await createReservation(store.id, {
        customerId,
        staffId: staffA.id,
        startAt: slotOn(14, "10:00"),
        endAt: slotOn(14, "11:00"),
        status,
      });
    }

    const conflict = await findReservationConflict({
      storeId: store.id,
      startAt: slotOn(14, "10:00"),
      endAt: slotOn(14, "11:00"),
      staffId: staffA.id,
    });
    expect(conflict).toBeNull();
  });

  it("日時変更では対象の予約自身を除外して判定する", async () => {
    const reservation = await createReservation(store.id, {
      customerId,
      staffId: staffA.id,
      startAt: slotOn(15, "10:00"),
      endAt: slotOn(15, "11:00"),
      status: "CONFIRMED",
    });

    // 自身を除外しなければ staff 重複になる時間帯
    await expect(
      findReservationConflict({
        storeId: store.id,
        startAt: slotOn(15, "10:00"),
        endAt: slotOn(15, "11:00"),
        staffId: staffA.id,
      })
    ).resolves.toBe("staff");

    await expect(
      findReservationConflict({
        storeId: store.id,
        startAt: slotOn(15, "10:00"),
        endAt: slotOn(15, "11:00"),
        staffId: staffA.id,
        excludeReservationId: reservation.id,
      })
    ).resolves.toBeNull();
  });

  it("他店舗の予約は重複判定に影響しない", async () => {
    const otherStore = await createTestStore();
    try {
      const otherStaff = await createStaff(otherStore.id, { name: "他店舗の担当" });
      const otherCustomer = await createCustomer(otherStore.id, { name: "他店舗の顧客" });
      for (let i = 0; i < 3; i++) {
        await createReservation(otherStore.id, {
          customerId: otherCustomer.id,
          staffId: otherStaff.id,
          startAt: slotOn(16, "10:00"),
          endAt: slotOn(16, "11:00"),
          status: "CONFIRMED",
        });
      }

      const conflict = await findReservationConflict({
        storeId: store.id,
        startAt: slotOn(16, "10:00"),
        endAt: slotOn(16, "11:00"),
        staffId: staffA.id,
      });
      expect(conflict).toBeNull();
    } finally {
      await destroyTestStore(otherStore.id);
    }
  });
});
