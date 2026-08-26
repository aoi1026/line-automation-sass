import type { Store } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runAutomations } from "@/lib/automation/engine";
import { prisma } from "@/lib/db";
import { addHours } from "@/lib/jst";
import { isLineConfigured } from "@/lib/line/client";
import { deliverMessage } from "@/lib/messaging";
import {
  createAutomationSetting,
  createCustomer,
  createLinkedCustomer,
  createReservation,
  createTemplate,
  createTestStore,
  destroyTestStore,
} from "./helpers";

describe("デモモード（LINEチャネル未設定の店舗）", () => {
  let store: Store;

  beforeAll(async () => {
    // lineChannelAccessToken を設定しない = デモモード
    store = await createTestStore();
    const template = await createTemplate(
      store.id,
      "REMINDER",
      "{お客様名}様\n{予約日時} にご予約をいただいております。"
    );
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

  it("LINEチャネル未設定の店舗はデモモードと判定される", () => {
    expect(store.lineChannelAccessToken).toBe("");
    expect(isLineConfigured(store)).toBe(false);
  });

  it("個別送信はデモチャネルの送信済みとして記録される（実送信されない）", async () => {
    const customer = await createLinkedCustomer(store.id, { name: "福田里奈" });

    const log = await deliverMessage({
      store,
      customer,
      kind: "MANUAL",
      content: "テスト送信のメッセージです。",
    });

    expect(log.channel).toBe("DEMO");
    expect(log.status).toBe("SENT");
    expect(log.error).toBe("");
    expect(log.storeId).toBe(store.id);
  });

  it("自動配信もデモチャネルの送信済みとして記録される", async () => {
    const now = new Date();
    const customer = await createLinkedCustomer(store.id, { name: "西村涼太" });
    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      startAt: addHours(now, 6),
      endAt: addHours(now, 7),
      status: "CONFIRMED",
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const log = await prisma.messageLog.findFirstOrThrow({
      where: { storeId: store.id, reservationId: reservation.id, kind: "REMINDER" },
    });
    expect(log.channel).toBe("DEMO");
    expect(log.status).toBe("SENT");
  });

  it("LINE未連携の顧客はデモチャネルのスキップとして記録される", async () => {
    const customer = await createCustomer(store.id, { name: "内田奈緒" });

    const log = await deliverMessage({
      store,
      customer,
      kind: "MANUAL",
      content: "テスト送信のメッセージです。",
    });

    expect(log.channel).toBe("DEMO");
    expect(log.status).toBe("SKIPPED");
    expect(log.error).toContain("LINE未連携");
  });
});
