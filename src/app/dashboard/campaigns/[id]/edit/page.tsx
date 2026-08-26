import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseRules } from "@/lib/segments";
import { requireSession } from "@/lib/session";
import { PageHeader } from "@/components/ui/page-header";
import { CampaignForm } from "../../_components/campaign-form";
import { loadCampaignFormOptions } from "../../_components/form-options";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "キャンペーンの編集" };

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, storeId: session.storeId },
  });
  if (!campaign) notFound();
  if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
    redirect(`/dashboard/campaigns/${campaign.id}`);
  }

  const options = await loadCampaignFormOptions(session.storeId);

  return (
    <>
      <PageHeader
        title="キャンペーンを編集"
        description="下書き・配信予約中のキャンペーンのみ編集できます。"
      />
      <CampaignForm
        {...options}
        campaign={{
          id: campaign.id,
          title: campaign.title,
          content: campaign.content,
          segmentId: campaign.segmentId,
          filters: campaign.segmentId
            ? null
            : campaign.filters
              ? parseRules(campaign.filters)
              : null,
          couponId: campaign.couponId,
          status: campaign.status,
          scheduledAt: campaign.scheduledAt
            ? campaign.scheduledAt.toISOString()
            : null,
        }}
      />
    </>
  );
}
