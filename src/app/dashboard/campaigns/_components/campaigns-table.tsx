"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { CampaignStatus } from "@prisma/client";
import { CAMPAIGN_STATUS_COLORS, CAMPAIGN_STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CampaignActions } from "./campaign-detail-actions";

export type CampaignRow = {
  id: string;
  title: string;
  status: CampaignStatus;
  /** 配信対象（セグメント名・条件説明・全顧客） */
  targetLabel: string;
  /** 配信予定/配信日時（表示用整形済み） */
  scheduleLabel: string;
  /** 配信数（送信数/対象数、表示用整形済み） */
  sendLabel: string;
};

/** キャンペーン一覧テーブル（行クリックで詳細へ） */
export function CampaignsTable({ rows }: { rows: CampaignRow[] }) {
  const router = useRouter();

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>タイトル</TableHead>
              <TableHead>対象</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>配信予定・配信日時</TableHead>
              <TableHead>配信数</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/campaigns/${row.id}`)}
              >
                <TableCell className="max-w-[16rem] truncate font-medium text-gray-900">
                  {row.title}
                </TableCell>
                <TableCell className="max-w-[18rem] truncate text-gray-600">
                  {row.targetLabel}
                </TableCell>
                <TableCell>
                  <Badge className={CAMPAIGN_STATUS_COLORS[row.status]}>
                    {CAMPAIGN_STATUS_LABELS[row.status]}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap text-gray-600">
                  {row.scheduleLabel}
                </TableCell>
                <TableCell className="whitespace-nowrap text-gray-600">{row.sendLabel}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end">
                    <CampaignActions campaign={row} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
