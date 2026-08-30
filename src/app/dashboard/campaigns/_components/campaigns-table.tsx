"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CampaignStatus } from "@prisma/client";
import {
  CAMPAIGN_STATUS_COLORS,
  CAMPAIGN_STATUS_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
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

/** 一覧内のリンクに共通のフォーカスリング */
const LINK_FOCUS =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50";

/** キャンペーン一覧（sm以上: テーブル / sm未満: カード。行クリック・Enterキーで詳細へ） */
export function CampaignsTable({ rows }: { rows: CampaignRow[] }) {
  const router = useRouter();

  function open(id: string) {
    router.push(`/dashboard/campaigns/${id}`);
  }

  return (
    <>
      {/* デスクトップ: テーブル */}
      <Card className="hidden sm:block">
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
                  tabIndex={0}
                  aria-label={`${row.title}の詳細を開く`}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50"
                  onClick={() => open(row.id)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      open(row.id);
                    }
                  }}
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
                  <TableCell className="whitespace-nowrap text-gray-600">
                    {row.sendLabel}
                  </TableCell>
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

      {/* モバイル: カード（操作ボタンが画面外に出ないよう縦に並べる） */}
      <div className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <Card key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/dashboard/campaigns/${row.id}`}
                className={cn(
                  "min-w-0 flex-1 truncate font-medium text-gray-900 hover:text-brand-dark hover:underline",
                  LINK_FOCUS
                )}
              >
                {row.title}
              </Link>
              <Badge className={cn("shrink-0", CAMPAIGN_STATUS_COLORS[row.status])}>
                {CAMPAIGN_STATUS_LABELS[row.status]}
              </Badge>
            </div>

            <dl className="mt-3 space-y-1 text-xs text-gray-600">
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 text-gray-500">対象</dt>
                <dd className="min-w-0">{row.targetLabel}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 text-gray-500">配信日時</dt>
                <dd className="min-w-0">{row.scheduleLabel}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-14 shrink-0 text-gray-500">配信数</dt>
                <dd className="min-w-0 tabular-nums">{row.sendLabel}</dd>
              </div>
            </dl>

            {/* 配信済み・配信中は操作がないため、空のときは枠ごと非表示にする */}
            <div className="mt-3 flex flex-wrap justify-end gap-1.5 border-t border-gray-100 pt-3 empty:hidden">
              <CampaignActions campaign={row} />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
