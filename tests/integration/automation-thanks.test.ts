import type { Store } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runAutomations } from "@/lib/automation/engine";
import { prisma } from "@/lib/db";
import { addHours } from "@/lib/jst";
import {
  createAutomationSetting,
  createCustomer,
  createLinkedCustomer,
  createReservation,
  createTemplate,
  createTestStore,
  destroyTestStore,
} from "./helpers";

describe("自動配信: 来店お礼", () => {
  let store: Store;

  beforeAll(async () => {
    store = await createTestStore();
    const template = await createTemplate(
      store.id,
      "THANKS",
      "{お客様名}様\n本日はご来店いただきありがとうございました。"
    );
    // 来店完了の2時間後に送信する設定
    await createAutomationSetting(store.id, "THANKS", {
      offsetValue: 2,
      offsetUnit: "hours",
      templateId: template.id,
    });
  });

  afterAll(async () => {
    await destroyTestStore(store.id);
    await prisma.$disconnect();
  });

  it("来店完了から所定時間が経過した予約にお礼が送信される", async () => {
    const now = new Date();
    const customer = await createLinkedCustomer(store.id, { name: "高橋美咲" });
    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      startAt: addHours(now, -4),
      endAt: addHours(now, -3),
      status: "COMPLETED",
      completedAt: addHours(now, -3),
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const logs = await prisma.messageLog.findMany({
      where: { storeId: store.id, reservationId: reservation.id, kind: "THANKS" },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe("SENT");
    expect(logs[0].content).toContain("高橋美咲");
  });

  it("LINE未連携の顧客にはスキップとして記録される", async () => {
    const now = new Date();
    const customer = await createCustomer(store.id, { name: "田中愛" });
    expect(customer.lineUserId).toBeNull();

    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      startAt: addHours(now, -4),
      endAt: addHours(now, -3),
      status: "COMPLETED",
      completedAt: addHours(now, -3),
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const logs = await prisma.messageLog.findMany({
      where: { storeId: store.id, reservationId: reservation.id, kind: "THANKS" },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe("SKIPPED");
    expect(logs[0].channel).toBe("DEMO");
    expect(logs[0].error).toContain("LINE未連携");
  });

  it("完了直後（送信時刻前）の予約には送信されない", async () => {
    const now = new Date();
    const customer = await createLinkedCustomer(store.id, { name: "伊藤結衣" });
    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      startAt: addHours(now, -2),
      endAt: addHours(now, -1),
      status: "COMPLETED",
      // 完了から1時間しか経っていないため、2時間後送信の対象にはならない
      completedAt: addHours(now, -1),
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const count = await prisma.messageLog.count({
      where: { storeId: store.id, reservationId: reservation.id, kind: "THANKS" },
    });
    expect(count).toBe(0);
  });

  it("来店済みでない予約には送信されない", async () => {
    const now = new Date();
    const customer = await createLinkedCustomer(store.id, { name: "渡辺翔" });
    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      startAt: addHours(now, -4),
      endAt: addHours(now, -3),
      status: "CONFIRMED",
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const count = await prisma.messageLog.count({
      where: { storeId: store.id, reservationId: reservation.id, kind: "THANKS" },
    });
    expect(count).toBe(0);
  });

  it("2回実行してもお礼は1件しか記録されない（冪等）", async () => {
    const now = new Date();
    const customer = await createLinkedCustomer(store.id, { name: "中村さくら" });
    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      startAt: addHours(now, -5),
      endAt: addHours(now, -4),
      status: "COMPLETED",
      completedAt: addHours(now, -4),
    });

    await runAutomations({ storeId: store.id, now });
    await runAutomations({ storeId: store.id, now });

    const count = await prisma.messageLog.count({
      where: { storeId: store.id, reservationId: reservation.id, kind: "THANKS" },
    });
    expect(count).toBe(1);
  });
});
