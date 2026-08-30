/**
 * 配信の信頼性まわりの回帰テスト。
 * - 予約確認メッセージの直後にリマインダーが続けて届かないこと
 * - 送信に失敗したリマインダーが再送され、上限回数で打ち切られること
 * - 中断されて SENDING のまま止まったキャンペーンが再開されること
 */
import type { Store } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runAutomations } from "@/lib/automation/engine";
import { REMINDER_MAX_ATTEMPTS } from "@/lib/automation/reminders";
import { prisma } from "@/lib/db";
import { addHours, addMinutes } from "@/lib/jst";
import {
  attachTag,
  createAutomationSetting,
  createCampaign,
  createLinkedCustomer,
  createReservation,
  createTag,
  createTemplate,
  createTestStore,
  destroyTestStore,
} from "./helpers";

describe("自動配信: リマインダーの重複防止と再送", () => {
  let store: Store;

  beforeAll(async () => {
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

  it("予約確認メッセージの直後はリマインダーを送らず、猶予時間の経過後に送る", async () => {
    const now = new Date();
    const customer = await createLinkedCustomer(store.id, { name: "小林芽衣" });
    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      startAt: addHours(now, 12),
      endAt: addHours(now, 13),
      status: "CONFIRMED",
    });
    // 予約登録時に確認メッセージが届いた状態を再現する
    await prisma.messageLog.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        reservationId: reservation.id,
        kind: "BOOKING_CONFIRMATION",
        channel: "DEMO",
        status: "SENT",
        content: "ご予約を承りました。",
        sentAt: now,
      },
    });

    const first = await runAutomations({ storeId: store.id, now });
    expect(first.errors).toEqual([]);
    const rightAfter = await prisma.messageLog.count({
      where: { storeId: store.id, reservationId: reservation.id, kind: "REMINDER" },
    });
    expect(rightAfter).toBe(0);

    // 猶予時間（2時間）を過ぎれば通常どおり送信される
    const later = await runAutomations({ storeId: store.id, now: addHours(now, 3) });
    expect(later.errors).toEqual([]);
    const logs = await prisma.messageLog.findMany({
      where: { storeId: store.id, reservationId: reservation.id, kind: "REMINDER" },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe("SENT");
  });

  it("送信に失敗したリマインダーは再送される", async () => {
    const now = new Date();
    const customer = await createLinkedCustomer(store.id, { name: "中村莉央" });
    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      startAt: addHours(now, 10),
      endAt: addHours(now, 11),
      status: "CONFIRMED",
    });
    await prisma.messageLog.create({
      data: {
        storeId: store.id,
        customerId: customer.id,
        reservationId: reservation.id,
        kind: "REMINDER",
        channel: "LINE",
        status: "FAILED",
        content: "前回の送信は失敗しました",
        error: "一時的な送信エラー",
        sentAt: now,
      },
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const logs = await prisma.messageLog.findMany({
      where: { storeId: store.id, reservationId: reservation.id, kind: "REMINDER" },
    });
    expect(logs).toHaveLength(2);
    expect(logs.filter((l) => l.status === "SENT")).toHaveLength(1);
  });

  it("失敗が上限回数に達したリマインダーは再送しない", async () => {
    const now = new Date();
    const customer = await createLinkedCustomer(store.id, { name: "藤井香帆" });
    const reservation = await createReservation(store.id, {
      customerId: customer.id,
      startAt: addHours(now, 8),
      endAt: addHours(now, 9),
      status: "CONFIRMED",
    });
    for (let i = 0; i < REMINDER_MAX_ATTEMPTS; i++) {
      await prisma.messageLog.create({
        data: {
          storeId: store.id,
          customerId: customer.id,
          reservationId: reservation.id,
          kind: "REMINDER",
          channel: "LINE",
          status: "FAILED",
          content: "送信に失敗しました",
          error: "宛先が無効です",
          sentAt: now,
        },
      });
    }

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const count = await prisma.messageLog.count({
      where: { storeId: store.id, reservationId: reservation.id, kind: "REMINDER" },
    });
    expect(count).toBe(REMINDER_MAX_ATTEMPTS);
  });
});

describe("キャンペーン配信: 中断からの復旧", () => {
  let store: Store;

  beforeAll(async () => {
    store = await createTestStore();
  });

  afterAll(async () => {
    await destroyTestStore(store.id);
    await prisma.$disconnect();
  });

  it("SENDINGのまま止まったキャンペーンが再開され、送信済みの顧客には再送されない", async () => {
    const now = new Date();
    const tag = await createTag(store.id, "復旧テスト対象");
    const sentCustomer = await createLinkedCustomer(store.id, { name: "岡田真央" });
    const pendingCustomer = await createLinkedCustomer(store.id, { name: "長谷川湊" });
    for (const c of [sentCustomer, pendingCustomer]) await attachTag(c.id, tag.id);

    const campaign = await createCampaign(store.id, {
      title: "中断したキャンペーン",
      content: "{お客様名}様へのご案内です。",
      filters: { tagIds: [tag.id] },
      // 配信の途中でプロセスが落ちた状態を再現する
      status: "SENDING",
      scheduledAt: addHours(now, -1),
    });
    await prisma.messageLog.create({
      data: {
        storeId: store.id,
        customerId: sentCustomer.id,
        campaignId: campaign.id,
        kind: "CAMPAIGN",
        channel: "DEMO",
        status: "SENT",
        content: "岡田真央様へのご案内です。",
        sentAt: now,
      },
    });

    // 猶予（15分）を過ぎた時刻として、30分後の実行を再現する
    const summary = await runAutomations({ storeId: store.id, now: addMinutes(now, 30) });
    expect(summary.errors).toEqual([]);

    const updated = await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } });
    expect(updated.status).toBe("SENT");
    expect(updated.sentCount).toBe(2);

    const logs = await prisma.messageLog.findMany({
      where: { storeId: store.id, campaignId: campaign.id, kind: "CAMPAIGN" },
    });
    expect(logs).toHaveLength(2);
    expect(logs.filter((l) => l.customerId === sentCustomer.id)).toHaveLength(1);
    expect(logs.filter((l) => l.customerId === pendingCustomer.id)).toHaveLength(1);
  });

  it("配信を始めたばかりのSENDINGのキャンペーンには手を出さない", async () => {
    const now = new Date();
    const tag = await createTag(store.id, "配信中テスト対象");
    const customer = await createLinkedCustomer(store.id, { name: "村上千尋" });
    await attachTag(customer.id, tag.id);

    const campaign = await createCampaign(store.id, {
      title: "配信中のキャンペーン",
      content: "{お客様名}様へのご案内です。",
      filters: { tagIds: [tag.id] },
      status: "SENDING",
      scheduledAt: addHours(now, -1),
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const updated = await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } });
    expect(updated.status).toBe("SENDING");

    const count = await prisma.messageLog.count({
      where: { storeId: store.id, campaignId: campaign.id, kind: "CAMPAIGN" },
    });
    expect(count).toBe(0);
  });
});
