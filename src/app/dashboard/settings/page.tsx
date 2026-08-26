import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getAppUrl } from "@/lib/utils";
import { isLineConfigured } from "@/lib/line/client";
import { DEFAULT_BUSINESS_HOURS, type BusinessHours } from "@/lib/constants";
import { DAY_KEYS } from "@/lib/jst";
import { PageHeader } from "@/components/ui/page-header";
import {
  SettingsTabs,
  type SettingsTabValue,
} from "./_components/settings-tabs";

export const metadata: Metadata = { title: "設定" };

const TAB_VALUES: SettingsTabValue[] = ["store", "hours", "services", "staff", "line"];

function parseBusinessHours(raw: unknown): BusinessHours {
  const source = (raw ?? {}) as Record<string, unknown>;
  const hours = {} as BusinessHours;
  for (const day of DAY_KEYS) {
    const value = source[day] as { open?: unknown; close?: unknown; closed?: unknown } | undefined;
    const fallback = DEFAULT_BUSINESS_HOURS[day];
    hours[day] = {
      open: typeof value?.open === "string" ? value.open : fallback.open,
      close: typeof value?.close === "string" ? value.close : fallback.close,
      closed: typeof value?.closed === "boolean" ? value.closed : fallback.closed,
    };
  }
  return hours;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireSession();
  const { tab } = await searchParams;
  const initialTab: SettingsTabValue = TAB_VALUES.includes(tab as SettingsTabValue)
    ? (tab as SettingsTabValue)
    : "store";

  const [store, services, staffMembers, holidays] = await Promise.all([
    prisma.store.findUnique({ where: { id: session.storeId } }),
    prisma.service.findMany({
      where: { storeId: session.storeId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.staffMember.findMany({
      where: { storeId: session.storeId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.storeHoliday.findMany({
      where: { storeId: session.storeId },
      orderBy: { date: "asc" },
    }),
  ]);
  if (!store) redirect("/login");

  const appUrl = getAppUrl();

  return (
    <>
      <PageHeader
        title="設定"
        description="店舗情報・営業時間・メニュー・スタッフ・LINE連携を管理できます。"
      />
      <SettingsTabs
        initialTab={initialTab}
        storeInfo={{
          name: store.name,
          phone: store.phone,
          address: store.address,
          description: store.description,
          slotIntervalMin: store.slotIntervalMin,
          defaultRebookingIntervalDays: store.defaultRebookingIntervalDays,
          reserveUrl: `${appUrl}/r/${store.slug}`,
        }}
        businessHours={parseBusinessHours(store.businessHours)}
        holidays={holidays.map((h) => ({
          id: h.id,
          date: h.date.toISOString(),
          reason: h.reason,
        }))}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          category: s.category,
          durationMin: s.durationMin,
          price: s.price,
          repeatIntervalDays: s.repeatIntervalDays,
          sortOrder: s.sortOrder,
          active: s.active,
        }))}
        staffMembers={staffMembers.map((s) => ({
          id: s.id,
          name: s.name,
          title: s.title,
          sortOrder: s.sortOrder,
          active: s.active,
        }))}
        line={{
          configured: isLineConfigured(store),
          basicId: store.lineBasicId,
          webhookUrl: `${appUrl}/api/line/webhook/${store.id}`,
        }}
      />
    </>
  );
}
