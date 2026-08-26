import type { Prisma, Store } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runAutomations } from "@/lib/automation/engine";
import { prisma } from "@/lib/db";
import { addHours } from "@/lib/jst";
import {
  attachTag,
  createCampaign,
  createCustomer,
  createLinkedCustomer,
  createTag,
  createTestStore,
  destroyTestStore,
} from "./helpers";

/** 対象をこのテスト専用のタグに限定するための抽出条件 */
function tagFilter(tagId: string): Prisma.InputJsonValue {
  return { tagIds: [tagId] };
}

describe("キャンペーン配信", () => {
  let store: Store;

  beforeAll(async () => {
    store = await createTestStore();
  });

  afterAll(async () => {
    await destroyTestStore(store.id);
    await prisma.$disconnect();
  });

  it("配信予定時刻を過ぎたキャンペーンが配信され、対象数と送信数が整合する", async () => {
    const now = new Date();
    const tag = await createTag(store.id, "キャンペーン対象A");

    const linked1 = await createLinkedCustomer(store.id, { name: "青木結菜" });
    const linked2 = await createLinkedCustomer(store.id, { name: "上田拓真" });
    const unlinked = await createCustomer(store.id, { name: "遠藤美月" });
    for (const c of [linked1, linked2, unlinked]) await attachTag(c.id, tag.id);

    const campaign = await createCampaign(store.id, {
      title: "夏の特別キャンペーン",
      content: "{お客様名}様\n期間限定のご案内です。",
      filters: tagFilter(tag.id),
      status: "SCHEDULED",
      scheduledAt: addHours(now, -1),
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const updated = await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } });
    expect(updated.status).toBe("SENT");
    expect(updated.sentAt).not.toBeNull();
    // 対象3件のうち、LINE連携済みの2件が送信成功
    expect(updated.targetCount).toBe(3);
    expect(updated.sentCount).toBe(2);

    const logs = await prisma.messageLog.findMany({
      where: { storeId: store.id, campaignId: campaign.id },
    });
    expect(logs).toHaveLength(3);
    expect(logs.filter((l) => l.status === "SENT")).toHaveLength(2);
    expect(logs.filter((l) => l.status === "SKIPPED")).toHaveLength(1);
    expect(logs.every((l) => l.kind === "CAMPAIGN")).toBe(true);

    const sentToLinked1 = logs.find((l) => l.customerId === linked1.id);
    expect(sentToLinked1?.content).toContain("青木結菜");
  });

  it("2回実行してもキャンペーンは二重配信されない（冪等）", async () => {
    const now = new Date();
    const tag = await createTag(store.id, "キャンペーン対象B");
    const customer = await createLinkedCustomer(store.id, { name: "川口莉子" });
    await attachTag(customer.id, tag.id);

    const campaign = await createCampaign(store.id, {
      title: "リピーター様限定クーポン",
      content: "{お客様名}様へのご案内です。",
      filters: tagFilter(tag.id),
      status: "SCHEDULED",
      scheduledAt: addHours(now, -2),
    });

    await runAutomations({ storeId: store.id, now });
    await runAutomations({ storeId: store.id, now });

    const logs = await prisma.messageLog.count({
      where: { storeId: store.id, campaignId: campaign.id },
    });
    expect(logs).toBe(1);

    const updated = await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } });
    expect(updated.status).toBe("SENT");
    expect(updated.sentCount).toBe(1);
  });

  it("配信予定時刻がまだ先のキャンペーンは配信されない", async () => {
    const now = new Date();
    const tag = await createTag(store.id, "キャンペーン対象C");
    const customer = await createLinkedCustomer(store.id, { name: "木下彩花" });
    await attachTag(customer.id, tag.id);

    const campaign = await createCampaign(store.id, {
      title: "来週のお知らせ",
      content: "{お客様名}様へのご案内です。",
      filters: tagFilter(tag.id),
      status: "SCHEDULED",
      scheduledAt: addHours(now, 3),
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const updated = await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } });
    expect(updated.status).toBe("SCHEDULED");
    expect(updated.sentAt).toBeNull();

    const logs = await prisma.messageLog.count({
      where: { storeId: store.id, campaignId: campaign.id },
    });
    expect(logs).toBe(0);
  });

  it("下書きのキャンペーンは配信されない", async () => {
    const now = new Date();
    const tag = await createTag(store.id, "キャンペーン対象D");
    const customer = await createLinkedCustomer(store.id, { name: "斉藤楓" });
    await attachTag(customer.id, tag.id);

    const campaign = await createCampaign(store.id, {
      title: "下書きのお知らせ",
      content: "{お客様名}様へのご案内です。",
      filters: tagFilter(tag.id),
      status: "DRAFT",
      scheduledAt: addHours(now, -1),
    });

    const summary = await runAutomations({ storeId: store.id, now });
    expect(summary.errors).toEqual([]);

    const updated = await prisma.campaign.findUniqueOrThrow({ where: { id: campaign.id } });
    expect(updated.status).toBe("DRAFT");

    const logs = await prisma.messageLog.count({
      where: { storeId: store.id, campaignId: campaign.id },
    });
    expect(logs).toBe(0);
  });

  it("配信完了時に店舗向けの通知が作成される", async () => {
    const now = new Date();
    const tag = await createTag(store.id, "キャンペーン対象E");
    const customer = await createLinkedCustomer(store.id, { name: "橋本咲希" });
    await attachTag(customer.id, tag.id);

    const campaign = await createCampaign(store.id, {
      title: "通知確認キャンペーン",
      content: "{お客様名}様へのご案内です。",
      filters: tagFilter(tag.id),
      status: "SCHEDULED",
      scheduledAt: addHours(now, -1),
    });

    await runAutomations({ storeId: store.id, now });

    const notification = await prisma.notification.findFirst({
      where: { storeId: store.id, type: "CAMPAIGN_SENT", link: `/dashboard/campaigns/${campaign.id}` },
    });
    expect(notification).not.toBeNull();
    expect(notification?.title).toContain("通知確認キャンペーン");
  });
});
