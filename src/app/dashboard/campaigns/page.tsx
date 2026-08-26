import Link from "next/link";
import { CalendarClock, Megaphone, Plus, Send } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatJstDateTime, fromJst, jstParts } from "@/lib/jst";
import { describeRules, parseRules } from "@/lib/segments";
import { requireSession } from "@/lib/session";
import { formatNumber } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { CampaignsTable, type CampaignRow } from "./_components/campaigns-table";

export default async function CampaignsPage() {
  const session = await requireSession();

  const now = new Date();
  const { year, month } = jstParts(now);
  const monthStart = fromJst(`${year}-${String(month).padStart(2, "0")}-01`);

  const [campaigns, tags, sentCampaignCount, monthlySendCount, scheduledCount] =
    await Promise.all([
      prisma.campaign.findMany({
        where: { storeId: session.storeId },
        include: { segment: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.tag.findMany({ where: { storeId: session.storeId } }),
      prisma.campaign.count({ where: { storeId: session.storeId, status: "SENT" } }),
      prisma.messageLog.count({
        where: {
          storeId: session.storeId,
          kind: "CAMPAIGN",
          status: "SENT",
          sentAt: { gte: monthStart },
        },
      }),
      prisma.campaign.count({ where: { storeId: session.storeId, status: "SCHEDULED" } }),
    ]);

  const tagNameById = new Map(tags.map((t) => [t.id, t.name]));
  const rows: CampaignRow[] = campaigns.map((c) => {
    let targetLabel = "全顧客";
    if (c.segment) {
      targetLabel = c.segment.name;
    } else if (c.filters) {
      const rules = parseRules(c.filters);
      const tagNames = (rules.tagIds ?? [])
        .map((id) => tagNameById.get(id))
        .filter((name): name is string => name !== undefined);
      targetLabel = describeRules(rules, tagNames);
    }
    return {
      id: c.id,
      title: c.title,
      status: c.status,
      targetLabel,
      scheduleLabel:
        c.status === "SENT" || c.status === "SENDING"
          ? c.sentAt
            ? formatJstDateTime(c.sentAt)
            : "－"
          : c.scheduledAt
            ? formatJstDateTime(c.scheduledAt)
            : "－",
      sendLabel:
        c.status === "SENT"
          ? `${formatNumber(c.sentCount)} / ${formatNumber(c.targetCount)}`
          : "－",
    };
  });

  return (
    <>
      <PageHeader
        title="キャンペーン"
        description="セグメントで対象を絞り込み、お客様のLINEへメッセージを一斉配信できます。"
        actions={
          <Link href="/dashboard/campaigns/new" className={buttonVariants()}>
            <Plus />
            キャンペーンを作成
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="配信済みキャンペーン"
          value={formatNumber(sentCampaignCount)}
          icon={<Megaphone />}
        />
        <StatCard
          label="今月の配信数"
          value={formatNumber(monthlySendCount)}
          sub="キャンペーンで送信したメッセージ数"
          icon={<Send />}
        />
        <StatCard
          label="配信予約中"
          value={formatNumber(scheduledCount)}
          icon={<CalendarClock />}
        />
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Megaphone />}
            title="キャンペーンがまだありません"
            description="「キャンペーンを作成」から、お客様への一斉配信メッセージを作成できます。"
            action={
              <Link href="/dashboard/campaigns/new" className={buttonVariants()}>
                <Plus />
                キャンペーンを作成
              </Link>
            }
          />
        ) : (
          <CampaignsTable rows={rows} />
        )}
      </div>
    </>
  );
}
