/**
 * 統合テスト用のヘルパー。
 *
 * すべてのテストは「slug が test- で始まるテスト専用店舗」を作り、その中だけで完結させる。
 * 既存の demo-salon などのデータには一切触れない。
 * 後片付けは店舗の削除（onDelete: Cascade により配下のレコードもすべて消える）で行う。
 */
import { randomBytes } from "node:crypto";
import type {
  AutomationSetting,
  Campaign,
  Customer,
  MessageKind,
  MessageTemplate,
  Prisma,
  Reservation,
  Service,
  StaffMember,
  Store,
  Tag,
} from "@prisma/client";
import { prisma } from "@/lib/db";

function randomSuffix(): string {
  return randomBytes(8).toString("hex");
}

/** テスト専用店舗の slug（既存データと衝突しないよう test- で始める） */
export function testSlug(): string {
  return `test-${randomSuffix()}`;
}

/** 店舗内で一意な LINE ユーザーID（@@unique([storeId, lineUserId]) 対策） */
export function testLineUserId(): string {
  return `Utest${randomSuffix()}`;
}

export async function createTestStore(
  overrides: Partial<Omit<Prisma.StoreUncheckedCreateInput, "id">> = {}
): Promise<Store> {
  return prisma.store.create({
    data: {
      name: "統合テスト用サロン",
      slug: testSlug(),
      ...overrides,
    },
  });
}

/** テスト店舗を削除する（cascade で配下のデータもすべて消える） */
export async function destroyTestStore(storeId: string): Promise<void> {
  await prisma.store.delete({ where: { id: storeId } });
}

export async function createCustomer(
  storeId: string,
  data: Partial<Omit<Prisma.CustomerUncheckedCreateInput, "storeId">> = {}
): Promise<Customer> {
  return prisma.customer.create({
    data: { name: "テスト顧客", ...data, storeId },
  });
}

/** LINE連携済みのテスト顧客 */
export async function createLinkedCustomer(
  storeId: string,
  data: Partial<Omit<Prisma.CustomerUncheckedCreateInput, "storeId">> = {}
): Promise<Customer> {
  return createCustomer(storeId, { lineUserId: testLineUserId(), ...data });
}

export async function createStaff(
  storeId: string,
  data: Partial<Omit<Prisma.StaffMemberUncheckedCreateInput, "storeId">> = {}
): Promise<StaffMember> {
  return prisma.staffMember.create({
    data: { name: "テスト担当者", ...data, storeId },
  });
}

export async function createService(
  storeId: string,
  data: Partial<Omit<Prisma.ServiceUncheckedCreateInput, "storeId">> = {}
): Promise<Service> {
  return prisma.service.create({
    data: { name: "テストメニュー", durationMin: 60, price: 5000, ...data, storeId },
  });
}

export async function createReservation(
  storeId: string,
  data: Omit<Prisma.ReservationUncheckedCreateInput, "storeId">
): Promise<Reservation> {
  return prisma.reservation.create({ data: { ...data, storeId } });
}

export async function createTemplate(
  storeId: string,
  kind: MessageKind,
  content: string
): Promise<MessageTemplate> {
  return prisma.messageTemplate.create({
    data: { storeId, kind, name: "テスト用テンプレート", content, enabled: true },
  });
}

export async function createAutomationSetting(
  storeId: string,
  kind: MessageKind,
  data: Partial<Omit<Prisma.AutomationSettingUncheckedCreateInput, "storeId" | "kind">> = {}
): Promise<AutomationSetting> {
  return prisma.automationSetting.create({
    data: { enabled: true, ...data, storeId, kind },
  });
}

export async function createTag(storeId: string, name: string): Promise<Tag> {
  return prisma.tag.create({ data: { storeId, name } });
}

export async function attachTag(customerId: string, tagId: string): Promise<void> {
  await prisma.customerTag.create({ data: { customerId, tagId } });
}

export async function createCampaign(
  storeId: string,
  data: Omit<Prisma.CampaignUncheckedCreateInput, "storeId">
): Promise<Campaign> {
  return prisma.campaign.create({ data: { ...data, storeId } });
}
