"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const PERIOD_DAYS = [30, 90, 365] as const;
export type PeriodDays = (typeof PERIOD_DAYS)[number];

export const PERIOD_LABELS: Record<PeriodDays, string> = {
  30: "直近30日",
  90: "直近90日",
  365: "直近1年",
};

/** 期間切替タブ（?days= で切り替え） */
export function PeriodTabs({ days }: { days: PeriodDays }) {
  const router = useRouter();

  return (
    <Tabs
      value={String(days)}
      onValueChange={(value) => {
        router.push(`/dashboard/analytics?days=${value}`, { scroll: false });
      }}
    >
      <TabsList>
        {PERIOD_DAYS.map((d) => (
          <TabsTrigger key={d} value={String(d)}>
            {PERIOD_LABELS[d]}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
