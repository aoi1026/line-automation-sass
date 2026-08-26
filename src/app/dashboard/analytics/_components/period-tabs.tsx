"use client";

import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PERIOD_DAYS, PERIOD_LABELS, type PeriodDays } from "./period";

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
