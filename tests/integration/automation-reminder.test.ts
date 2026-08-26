import type { Store } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runAutomations } from "@/lib/automation/engine";
import { prisma } from "@/lib/db";
import { addDays, addHours } from "@/lib/jst";
import {
  createAutomationSetting,
  createLinkedCustomer,
  createReservation,
  createTemplate,
  createTestStore,
  destroyTestStore,
} from "./helpers";

describe("自動配信: リマインダー", () => {
  let store: Store;

  beforeAll(async () => {
    store = await createTestStore();
    const template = await createTemplate(
      store.id,
      "REMINDER",
      "{お客様名}様\n{予約日時} にご予約をいただいております。"
    );
    // 予約の1日前に送信する設定
    await createAutomationSetting(store.id, "REMINDER", {
      offsetValue: 1,
      offsetUnit: "days",
      templateId: template.id,
    });
  });

  afterAll(async () => {
    await destroyTestStore(store.id);
    await prisma.$disconnect();
  });

  it("2回実行してもリマインダーは1件しか記録されない（冪等）", async () => {
    const now = new Date();
    const customer = await createLinkedCustomer(store.id, { name: "山田花子" });
    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      startAt: addHours(now, 12),
      endAt: addHours(now, 13),
      status: "CONFIRMED",
    });

    const first = await runAutomations({ storeId: store.id, now });
    const second = await runAutomations({ storeId: store.id, now });

    expect(first.errors).toEqual([]);
    expect(second.errors).toEqual([]);

    const logs = await prisma.messageLog.findMany({
      where: { storeId: store.id, reservationId: reservation.id, kind: "REMINDER" },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe("SENT");
    expect(logs[0].content).toContain("山田花子");
  });

  it("送信オフセットより先の予約には送信されない", async () => {
    const now = new Date();
    const customer = await createLinkedCustomer(store.id, { name: "佐藤太郎" });
    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      // 3日後の予約は「1日前に送信」の対象範囲外
      startAt: addDays(now, 3),
      endAt: addHours(addDays(now, 3), 1),
      status: "CONFIRMED",
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const count = await prisma.messageLog.count({
      where: { storeId: store.id, reservationId: reservation.id, kind: "REMINDER" },
    });
    expect(count).toBe(0);
  });

  it("キャンセル済みの予約には送信されない", async () => {
    const now = new Date();
    const customer = await createLinkedCustomer(store.id, { name: "鈴木一郎" });
    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      startAt: addHours(now, 10),
      endAt: addHours(now, 11),
      status: "CANCELLED",
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const count = await prisma.messageLog.count({
      where: { storeId: store.id, reservationId: reservation.id, kind: "REMINDER" },
    });
    expect(count).toBe(0);
  });
});
