import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import {
  CAMPAIGN_STATUS_COLORS,
  CAMPAIGN_STATUS_LABELS,
  MESSAGE_STATUS_COLORS,
  MESSAGE_STATUS_LABELS,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatJstDateTime } from "@/lib/jst";
import { describeRules, parseRules } from "@/lib/segments";
import { requireSession } from "@/lib/session";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CampaignActions } from "../_components/campaign-detail-actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "キャンペーン詳細" };

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const campaign = await prisma.campaign.findFirst({
    where: { id, storeId: session.storeId },
    include: {
      segment: { select: { name: true } },
      coupon: { select: { title: true } },
    },
  });
  if (!campaign) notFound();

  const [tags, logs, skippedCount] = await Promise.all([
    prisma.tag.findMany({ where: { storeId: session.storeId } }),
    prisma.messageLog.findMany({
      where: { storeId: session.storeId, campaignId: campaign.id },
      include: { customer: { select: { name: true } } },
      orderBy: { sentAt: "desc" },
      take: 200,
    }),
    prisma.messageLog.count({
      where: { storeId: session.storeId, campaignId: campaign.id, status: "SKIPPED" },
    }),
  ]);

  const tagNameById = new Map(tags.map((t) => [t.id, t.name]));
  let targetLabel = "全顧客";
  if (campaign.segment) {
    targetLabel = campaign.segment.name;
  } else if (campaign.filters) {
    const rules = parseRules(campaign.filters);
    const tagNames = (rules.tagIds ?? [])
      .map((tagId) => tagNameById.get(tagId))
      .filter((name): name is string => name !== undefined);
    targetLabel = describeRules(rules, tagNames);
  }

  const metaRows: { label: string; value: string }[] = [
    { label: "対象", value: targetLabel },
    { label: "クーポン", value: campaign.coupon?.title ?? "なし" },
  ];
  if (campaign.status === "SCHEDULED" && campaign.scheduledAt) {
    metaRows.push({ label: "配信予定", value: formatJstDateTime(campaign.scheduledAt) });
  }
  if (campaign.sentAt) {
    metaRows.push({ label: "配信日時", value: formatJstDateTime(campaign.sentAt) });
  }
  metaRows.push({ label: "作成日", value: formatJstDateTime(campaign.createdAt) });

  return (
    <>
      <Link
        href="/dashboard/campaigns"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        キャンペーン一覧
      </Link>

      <PageHeader
        title={campaign.title}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={CAMPAIGN_STATUS_COLORS[campaign.status]}>
              {CAMPAIGN_STATUS_LABELS[campaign.status]}
            </Badge>
            <CampaignActions
              campaign={{ id: campaign.id, title: campaign.title, status: campaign.status }}
              redirectAfterDelete
            />
          </div>
        }
      />

      {campaign.status === "SENT" && (
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="対象者数"
            value={formatNumber(campaign.targetCount)}
            icon={<Users />}
          />
          <StatCard label="送信数" value={formatNumber(campaign.sentCount)} />
          <StatCard label="スキップ" value={formatNumber(skippedCount)} sub="LINE未連携など" />
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* 本文プレビュー（LINE風） */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>本文プレビュー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-[#8CABD8] p-4 sm:p-6">
              <div className="max-w-md rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 shadow whitespace-pre-wrap break-words">
                {campaign.content}
              </div>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {"{お客様名} などのプレースホルダーは、送信時にお客様ごとの内容に置き換えられます。"}
            </p>
          </CardContent>
        </Card>

        {/* 概要 */}
        <Card>
          <CardHeader>
            <CardTitle>配信情報</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {metaRows.map((row) => (
                <div key={row.label}>
                  <dt className="text-xs font-medium text-gray-500">{row.label}</dt>
                  <dd className="mt-0.5 text-sm text-gray-900">{row.value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* 配信ログ */}
      {(logs.length > 0 || campaign.status === "SENT") && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle>配信ログ</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <p className="px-5 pb-5 text-sm text-gray-500">配信ログはまだありません。</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>顧客名</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>送信日時</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-gray-900">
                        {log.customer?.name ?? "－"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge className={MESSAGE_STATUS_COLORS[log.status]}>
                            {MESSAGE_STATUS_LABELS[log.status]}
                          </Badge>
                          {log.channel === "DEMO" && <Badge variant="outline">デモ</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-gray-600">
                        {formatJstDateTime(log.sentAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
