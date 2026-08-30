/**
 * キャンセル済み予約の「復元」の統合テスト。
 *
 * 復元は PATCH /api/reservations/[id] の action: "restore" で行われる。
 * - 元の時間帯が埋まっていればダブルブッキングを防ぐために復元できない
 * - 復元できた場合は確定に戻り、キャンセル理由がクリアされる
 * - これから先の予約なら、お客様へ予約確認のメッセージを送る
 */
import type { Customer, Store } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { addDays, fromJst, jstYmd } from "@/lib/jst";
import {
  createAutomationSetting,
  createLinkedCustomer,
  createReservation,
  createTemplate,
  createTestStore,
  destroyTestStore,
} from "./helpers";

const session = vi.hoisted(() => ({ storeId: "" }));

// APIルートのセッションをテスト店舗に固定する
vi.mock("@/lib/session", () => ({
  getSession: async () => ({
    userId: "test-user",
    storeId: session.storeId,
    role: "OWNER" as const,
  }),
}));

const { PATCH } = await import("@/app/api/reservations/[id]/route");

type RestoreResult = {
  status: number;
  body: { status?: string; notified?: boolean; error?: string };
};

async function restore(id: string): Promise<RestoreResult> {
  const req = new Request(`http://localhost/api/reservations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "restore" }),
  });
  const res = await PATCH(req, { params: Promise.resolve({ id }) });
  const body = (await res.json()) as RestoreResult["body"];
  return { status: res.status, body };
}

/** テストごとに別の日を使い、他のテストの予約と干渉させない */
function slotOn(daysFromToday: number, hm: string): Date {
  return fromJst(jstYmd(addDays(new Date(), daysFromToday)), hm);
}

describe("キャンセル済み予約の復元", () => {
  let store: Store;
  let customer: Customer;

  beforeAll(async () => {
    // スタッフ0名 = 同時受付可能数（キャパシティ）1
    store = await createTestStore();
    session.storeId = store.id;
    customer = await createLinkedCustomer(store.id, { name: "復元テスト顧客" });
    await createTemplate(
      store.id,
      "BOOKING_CONFIRMATION",
      "{お客様名}様\nご予約は {予約日時} です。"
    );
    await createAutomationSetting(store.id, "BOOKING_CONFIRMATION");
  });

  afterAll(async () => {
    await destroyTestStore(store.id);
    await prisma.$disconnect();
  });

  it("空いていれば確定に戻り、キャンセル理由がクリアされる", async () => {
    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      startAt: slotOn(20, "10:00"),
      endAt: slotOn(20, "11:00"),
      status: "CANCELLED",
      cancelReason: "お客様都合",
    });

    const { status, body } = await restore(reservation.id);
    expect(status).toBe(200);
    expect(body.status).toBe("CONFIRMED");

    const after = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservation.id },
    });
    expect(after.status).toBe("CONFIRMED");
    expect(after.cancelReason).toBe("");
  });

  it("同じ時間帯が別の予約で埋まっている場合は復元できない", async () => {
    const cancelled = await createReservation(store.id, {
      customerId: customer.id,
      startAt: slotOn(21, "10:00"),
      endAt: slotOn(21, "11:00"),
      status: "CANCELLED",
    });
    // キャンセル後に同じ枠へ入った別の予約
    await createReservation(store.id, {
      customerId: customer.id,
      startAt: slotOn(21, "10:30"),
      endAt: slotOn(21, "11:30"),
      status: "CONFIRMED",
    });

    const { status, body } = await restore(cancelled.id);
    expect(status).toBe(400);
    expect(body.error).toContain("復元できません");

    const after = await prisma.reservation.findUniqueOrThrow({
      where: { id: cancelled.id },
    });
    expect(after.status).toBe("CANCELLED");
  });

  it("これから先の予約を復元すると予約確認メッセージを送る", async () => {
    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      startAt: slotOn(22, "10:00"),
      endAt: slotOn(22, "11:00"),
      status: "CANCELLED",
    });

    const { body } = await restore(reservation.id);
    expect(body.notified).toBe(true);

    const logs = await prisma.messageLog.findMany({
      where: { storeId: store.id, reservationId: reservation.id },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].kind).toBe("BOOKING_CONFIRMATION");
    expect(logs[0].status).toBe("SENT");
  });

  it("過去の予約の復元では通知しない（記録の訂正のため）", async () => {
    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      startAt: slotOn(-5, "10:00"),
      endAt: slotOn(-5, "11:00"),
      status: "NO_SHOW",
    });

    const { body } = await restore(reservation.id);
    expect(body.status).toBe("CONFIRMED");
    expect(body.notified).toBe(false);

    const logs = await prisma.messageLog.findMany({
      where: { storeId: store.id, reservationId: reservation.id },
    });
    expect(logs).toHaveLength(0);
  });

  it("確定済みの予約は復元できない", async () => {
    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      startAt: slotOn(23, "10:00"),
      endAt: slotOn(23, "11:00"),
      status: "CONFIRMED",
    });

    const { status, body } = await restore(reservation.id);
    expect(status).toBe(400);
    expect(body.error).toBe("この操作は現在のステータスでは行えません");
  });
});
