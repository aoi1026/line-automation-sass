import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { CampaignForm } from "../_components/campaign-form";
import { loadCampaignFormOptions } from "../_components/form-options";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "キャンペーンの作成" };

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ segmentId?: string }>;
}) {
  const session = await requireSession();
  const { segmentId } = await searchParams;
  const options = await loadCampaignFormOptions(session.storeId);

  return (
    <>
      <PageHeader
        title="キャンペーンを作成"
        description="配信対象と本文を設定し、下書き保存・配信予約・即時配信ができます。"
      />
      <CampaignForm {...options} defaultSegmentId={segmentId} />
    </>
  );
}
