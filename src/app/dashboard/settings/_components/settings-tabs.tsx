"use client";

import { useState } from "react";
import type { BusinessHours } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QrCard } from "./qr-card";
import { StoreInfoForm } from "./store-info-form";
import { BusinessHoursForm } from "./business-hours-form";
import { HolidaysForm } from "./holidays-form";
import { ServicesTab } from "./services-tab";
import { StaffTab } from "./staff-tab";
import { LineTab } from "./line-tab";

export type SettingsTabValue =
  "store" | "hours" | "services" | "staff" | "line";

export type StoreInfoData = {
  name: string;
  phone: string;
  address: string;
  description: string;
  slotIntervalMin: number;
  defaultRebookingIntervalDays: number;
  reserveUrl: string;
};

export type ServiceRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  durationMin: number;
  price: number;
  repeatIntervalDays: number | null;
  sortOrder: number;
  active: boolean;
};

export type StaffRow = {
  id: string;
  name: string;
  title: string;
  sortOrder: number;
  active: boolean;
};

export type HolidayRow = {
  id: string;
  /** JST日付の00:00を表すISO文字列 */
  date: string;
  reason: string;
};

export type LineInfo = {
  configured: boolean;
  basicId: string;
  webhookUrl: string;
};

export function SettingsTabs({
  initialTab,
  storeInfo,
  businessHours,
  holidays,
  services,
  staffMembers,
  line,
}: {
  initialTab: SettingsTabValue;
  storeInfo: StoreInfoData;
  businessHours: BusinessHours;
  holidays: HolidayRow[];
  services: ServiceRow[];
  staffMembers: StaffRow[];
  line: LineInfo;
}) {
  const [tab, setTab] = useState<string>(initialTab);

  const handleChange = (value: string) => {
    setTab(value);
    // ?tab= をURLに反映（サーバー再取得は不要なので履歴のみ更新）
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <Tabs value={tab} onValueChange={handleChange}>
      {/* 幅の狭い画面ではタブが折り返さず横スクロールする（ページ全体は横スクロールしない） */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <TabsList
          aria-label="設定のカテゴリ"
          className="w-max min-w-full justify-start"
        >
          <TabsTrigger value="store" className="h-8 px-3">
            店舗情報
          </TabsTrigger>
          <TabsTrigger value="hours" className="h-8 px-3">
            営業時間
          </TabsTrigger>
          <TabsTrigger value="services" className="h-8 px-3">
            メニュー
          </TabsTrigger>
          <TabsTrigger value="staff" className="h-8 px-3">
            スタッフ
          </TabsTrigger>
          <TabsTrigger value="line" className="h-8 px-3">
            LINE連携
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="store">
        <div className="flex flex-col gap-4">
          <StoreInfoForm storeInfo={storeInfo} />
          <QrCard />
        </div>
      </TabsContent>
      <TabsContent value="hours">
        <div className="flex flex-col gap-4">
          <BusinessHoursForm initialHours={businessHours} />
          <HolidaysForm holidays={holidays} />
        </div>
      </TabsContent>
      <TabsContent value="services">
        <ServicesTab services={services} />
      </TabsContent>
      <TabsContent value="staff">
        <StaffTab staffMembers={staffMembers} />
      </TabsContent>
      <TabsContent value="line">
        <LineTab line={line} />
      </TabsContent>
    </Tabs>
  );
}
