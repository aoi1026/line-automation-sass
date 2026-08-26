import type { Store } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runAutomations } from "@/lib/automation/engine";
import { prisma } from "@/lib/db";
import { addDays, fromJst, jstParts, jstYmd } from "@/lib/jst";
import {
  createAutomationSetting,
  createLinkedCustomer,
  createTemplate,
  createTestStore,
  destroyTestStore,
} from "./helpers";

/** 指定日と同じJSTの月日を持つ誕生日（年は閏日も扱えるよう1992年固定） */
function birthdayOf(date: Date): Date {
  const { month, day } = jstParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return fromJst(`1992-${pad(month)}-${pad(day)}`);
}

describe("自動配信: 誕生日メッセージ", () => {
  let store: Store;
  const today = new Date();
  // JSTの本日10:00を実行時刻とする（送信時刻9時を過ぎている）
  const now = fromJst(jstYmd(today), "10:00");

  beforeAll(async () => {
    store = await createTestStore();
    const template = await createTemplate(
      store.id,
      "BIRTHDAY",
      "{お客様名}様\nお誕生日おめでとうございます。"
    );
    await createAutomationSetting(store.id, "BIRTHDAY", {
      sendHourJst: 9,
      templateId: template.id,
    });
  });

  afterAll(async () => {
    await destroyTestStore(store.id);
    await prisma.$disconnect();
  });

  it("誕生日当日の顧客に送信され、2回目の実行では送信されない（冪等）", async () => {
    const customer = await createLinkedCustomer(store.id, {
      name: "森田千夏",
      birthday: birthdayOf(today),
    });

    const first = await runAutomations({ storeId: store.id, now });
    const second = await runAutomations({ storeId: store.id, now });

    expect(first.errors).toEqual([]);
    expect(second.errors).toEqual([]);

    const logs = await prisma.messageLog.findMany({
      where: { storeId: store.id, customerId: customer.id, kind: "BIRTHDAY" },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe("SENT");
    expect(logs[0].content).toContain("森田千夏");
  });

  it("誕生日でない顧客には送信されない", async () => {
    const customer = await createLinkedCustomer(store.id, {
      name: "岡田涼",
      birthday: birthdayOf(addDays(today, 1)),
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const count = await prisma.messageLog.count({
      where: { storeId: store.id, customerId: customer.id, kind: "BIRTHDAY" },
    });
    expect(count).toBe(0);
  });

  it("誕生日が未登録の顧客には送信されない", async () => {
    const customer = await createLinkedCustomer(store.id, { name: "藤井蓮" });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const count = await prisma.messageLog.count({
      where: { storeId: store.id, customerId: customer.id, kind: "BIRTHDAY" },
    });
    expect(count).toBe(0);
  });

  it("設定した送信時刻より前の実行では送信されない", async () => {
    const customer = await createLinkedCustomer(store.id, {
      name: "石川陽菜",
      birthday: birthdayOf(today),
    });

    // JSTの本日8:00（送信時刻9時より前）
    const summary = await runAutomations({
      storeId: store.id,
      now: fromJst(jstYmd(today), "08:00"),
    });
    expect(summary.errors).toEqual([]);

    const count = await prisma.messageLog.count({
      where: { storeId: store.id, customerId: customer.id, kind: "BIRTHDAY" },
    });
    expect(count).toBe(0);
  });
});
