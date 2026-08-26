import type { Customer, Store } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { addDays } from "@/lib/jst";
import { countTargets, resolveTargets } from "@/lib/segments";
import { createCustomer, createLinkedCustomer, createTestStore, destroyTestStore } from "./helpers";

describe("セグメント抽出", () => {
  let store: Store;
  const now = new Date();

  // 休眠・LINE連携済み・来店回数多
  let dormantLinkedFrequent: Customer;
  // 休眠・LINE未連携・来店回数少
  let dormantUnlinkedRare: Customer;
  // 最近来店・LINE連携済み・来店回数多
  let recentLinkedFrequent: Customer;
  // 来店履歴なし
  let neverVisited: Customer;

  beforeAll(async () => {
    store = await createTestStore();
    dormantLinkedFrequent = await createLinkedCustomer(store.id, {
      name: "長谷川美穂",
      lastVisitAt: addDays(now, -60),
      visitCount: 5,
      totalSpent: 50000,
    });
    dormantUnlinkedRare = await createCustomer(store.id, {
      name: "村上健",
      lastVisitAt: addDays(now, -60),
      visitCount: 1,
      totalSpent: 6000,
    });
    recentLinkedFrequent = await createLinkedCustomer(store.id, {
      name: "近藤あかり",
      lastVisitAt: addDays(now, -10),
      visitCount: 5,
      totalSpent: 40000,
    });
    neverVisited = await createCustomer(store.id, { name: "原田優" });
  });

  afterAll(async () => {
    await destroyTestStore(store.id);
    await prisma.$disconnect();
  });

  const idsOf = (customers: Customer[]) => customers.map((c) => c.id).sort();

  it("条件なしのときは店舗の全顧客が対象になる", async () => {
    const targets = await resolveTargets(store.id, {}, now);
    expect(idsOf(targets)).toEqual(
      idsOf([dormantLinkedFrequent, dormantUnlinkedRare, recentLinkedFrequent, neverVisited])
    );
  });

  it("lastVisitDaysMin は最終来店からの経過日数で絞り込む", async () => {
    const targets = await resolveTargets(store.id, { lastVisitDaysMin: 30 }, now);
    expect(idsOf(targets)).toEqual(idsOf([dormantLinkedFrequent, dormantUnlinkedRare]));
  });

  it("lastVisitDaysMax は最近来店した顧客に絞り込む", async () => {
    const targets = await resolveTargets(store.id, { lastVisitDaysMax: 30 }, now);
    expect(idsOf(targets)).toEqual(idsOf([recentLinkedFrequent]));
  });

  it("visitCountMin は来店回数で絞り込む", async () => {
    const targets = await resolveTargets(store.id, { visitCountMin: 3 }, now);
    expect(idsOf(targets)).toEqual(idsOf([dormantLinkedFrequent, recentLinkedFrequent]));
  });

  it("hasLine はLINE連携済みの顧客のみに絞り込む", async () => {
    const targets = await resolveTargets(store.id, { hasLine: true }, now);
    expect(idsOf(targets)).toEqual(idsOf([dormantLinkedFrequent, recentLinkedFrequent]));
  });

  it("複数条件はすべてを満たす顧客のみに絞り込む", async () => {
    const targets = await resolveTargets(
      store.id,
      { lastVisitDaysMin: 30, visitCountMin: 3, hasLine: true },
      now
    );
    expect(idsOf(targets)).toEqual(idsOf([dormantLinkedFrequent]));
  });

  it("条件を満たす顧客がいない場合は空になる", async () => {
    const targets = await resolveTargets(
      store.id,
      { lastVisitDaysMin: 30, visitCountMin: 3, hasLine: false, totalSpentMin: 999999 },
      now
    );
    expect(targets).toEqual([]);
  });

  it("countTargets は抽出件数を返す", async () => {
    const count = await countTargets(store.id, { visitCountMin: 3 }, now);
    expect(count).toBe(2);
  });

  it("他店舗の顧客は抽出されない", async () => {
    const otherStore = await createTestStore();
    try {
      await createLinkedCustomer(otherStore.id, {
        name: "他店舗の顧客",
        lastVisitAt: addDays(now, -60),
        visitCount: 5,
      });
      const targets = await resolveTargets(store.id, { visitCountMin: 3 }, now);
      expect(idsOf(targets)).toEqual(idsOf([dormantLinkedFrequent, recentLinkedFrequent]));
    } finally {
      await destroyTestStore(otherStore.id);
    }
  });
});
