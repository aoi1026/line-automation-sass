import type { Store } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runAutomations } from "@/lib/automation/engine";
import { prisma } from "@/lib/db";
import { addDays, addHours } from "@/lib/jst";
import {
  createAutomationSetting,
  createLinkedCustomer,
  createReservation,
  createService,
  createTemplate,
  createTestStore,
  destroyTestStore,
} from "./helpers";

describe("自動配信: 再来店リマインド", () => {
  let store: Store;

  beforeAll(async () => {
    // 推奨再来店間隔は45日（店舗デフォルト）
    store = await createTestStore({ defaultRebookingIntervalDays: 45 });
    const template = await createTemplate(
      store.id,
      "REBOOKING",
      "{お客様名}様\n前回のご来店から{経過日数}日が経ちました。"
    );
    await createAutomationSetting(store.id, "REBOOKING", {
      sendHourJst: 0, // どの時刻の実行でも送信対象になるようにする
      templateId: template.id,
    });
  });

  afterAll(async () => {
    await destroyTestStore(store.id);
    await prisma.$disconnect();
  });

  it("推奨間隔を過ぎた顧客に再来店リマインドが送信される", async () => {
    const now = new Date();
    const customer = await createLinkedCustomer(store.id, {
      name: "小林彩",
      lastVisitAt: addDays(now, -60),
      visitCount: 3,
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const logs = await prisma.messageLog.findMany({
      where: { storeId: store.id, customerId: customer.id, kind: "REBOOKING" },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe("SENT");
    expect(logs[0].content).toContain("小林彩");
  });

  it("今後の予約がある顧客には送信されない", async () => {
    const now = new Date();
    const customer = await createLinkedCustomer(store.id, {
      name: "加藤直樹",
      lastVisitAt: addDays(now, -60),
      visitCount: 2,
    });
    await createReservation(store.id, {
      customerId: customer.id,
      startAt: addDays(now, 3),
      endAt: addHours(addDays(now, 3), 1),
      status: "CONFIRMED",
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const count = await prisma.messageLog.count({
      where: { storeId: store.id, customerId: customer.id, kind: "REBOOKING" },
    });
    expect(count).toBe(0);
  });

  it("推奨間隔がまだ来ていない顧客には送信されない", async () => {
    const now = new Date();
    const customer = await createLinkedCustomer(store.id, {
      name: "松本葵",
      lastVisitAt: addDays(now, -10),
      visitCount: 1,
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const count = await prisma.messageLog.count({
      where: { storeId: store.id, customerId: customer.id, kind: "REBOOKING" },
    });
    expect(count).toBe(0);
  });

  it("最後に受けたメニューの推奨間隔が店舗デフォルトより優先される", async () => {
    const now = new Date();
    // 推奨間隔90日のメニュー → 60日経過では対象にならない（店舗デフォルト45日なら対象になる）
    const service = await createService(store.id, {
      name: "縮毛矯正",
      repeatIntervalDays: 90,
    });
    const customer = await createLinkedCustomer(store.id, {
      name: "山口大地",
      lastVisitAt: addDays(now, -60),
      visitCount: 1,
    });
    await createReservation(store.id, {
      customerId: customer.id,
      serviceId: service.id,
      startAt: addDays(now, -60),
      endAt: addHours(addDays(now, -60), 1),
      status: "COMPLETED",
      completedAt: addDays(now, -60),
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const count = await prisma.messageLog.count({
      where: { storeId: store.id, customerId: customer.id, kind: "REBOOKING" },
    });
    expect(count).toBe(0);
  });

  it("2回実行しても再来店リマインドは1件しか記録されない（冪等）", async () => {
    const now = new Date();
    const customer = await createLinkedCustomer(store.id, {
      name: "井上遥",
      lastVisitAt: addDays(now, -70),
      visitCount: 4,
    });

    await runAutomations({ storeId: store.id, now });
    await runAutomations({ storeId: store.id, now });

    const count = await prisma.messageLog.count({
      where: { storeId: store.id, customerId: customer.id, kind: "REBOOKING" },
    });
    expect(count).toBe(1);
  });
});
