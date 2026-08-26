import { requireSession } from "@/lib/session";
import type { SegmentRules } from "@/lib/segments";
import { PageHeader } from "@/components/ui/page-header";
import { CampaignForm } from "../_components/campaign-form";
import { loadCampaignFormOptions } from "../_components/form-options";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "キャンペーンの作成" };

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{
    segmentId?: string;
    lastVisitDaysMin?: string;
    lastVisitDaysMax?: string;
  }>;
}) {
  const session = await requireSession();
  const { segmentId, lastVisitDaysMin, lastVisitDaysMax } = await searchParams;

  // 分析レポートの「この層に配信」から渡される抽出条件を初期値として引き継ぐ。
  // 引き継がないと配信対象が全顧客のままになり、意図しない一斉配信になる。
  const toDays = (v?: string) => {
    if (v === undefined) return undefined;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 ? n : undefined;
  };
  const defaultFilters: SegmentRules = {};
  const min = toDays(lastVisitDaysMin);
  const max = toDays(lastVisitDaysMax);
  if (min !== undefined) defaultFilters.lastVisitDaysMin = min;
  if (max !== undefined) defaultFilters.lastVisitDaysMax = max;
  const options = await loadCampaignFormOptions(session.storeId);

  return (
    <>
      <PageHeader
        title="キャンペーンを作成"
        description="配信対象と本文を設定し、下書き保存・配信予約・即時配信ができます。"
      />
      <CampaignForm
        {...options}
        defaultSegmentId={segmentId}
        defaultFilters={defaultFilters}
      />
    </>
  );
}
