"use client";

import * as React from "react";
import Link from "next/link";
import { Megaphone, Users } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SEGMENT_TARGET_PREVIEW_LIMIT, type SegmentTarget } from "./types";

/**
 * セグメントの対象人数バッジ。押すと対象のお客様一覧を表示し、
 * そのままキャンペーン作成（配信）へ進めるようにする。
 */
export function SegmentTargetsDialog({
  segmentId,
  segmentName,
  description,
  targetCount,
  targets,
}: {
  segmentId: string;
  segmentName: string;
  /** 抽出条件の説明文（describeRules の結果） */
  description: string;
  targetCount: number;
  /** 先頭 SEGMENT_TARGET_PREVIEW_LIMIT 件までの対象顧客 */
  targets: SegmentTarget[];
}) {
  const hidden = targetCount - targets.length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`セグメント「${segmentName}」の対象のお客様を見る`}
          className="inline-flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          <Badge
            variant="secondary"
            className="cursor-pointer underline-offset-2 hover:bg-gray-200 hover:underline"
          >
            {formatNumber(targetCount)}人
          </Badge>
        </button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>「{segmentName}」の対象のお客様</DialogTitle>
          <DialogDescription>
            条件: {description} ／ 対象 {formatNumber(targetCount)}人
          </DialogDescription>
        </DialogHeader>

        {targets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center">
            <Users aria-hidden="true" className="h-6 w-6 text-gray-300" />
            <p className="text-sm text-gray-500">
              条件に合うお客様はいません。条件をゆるめるとお客様が見つかりやすくなります。
            </p>
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200">
            <ul className="divide-y divide-gray-100">
              {targets.map((target) => (
                <li key={target.id}>
                  <Link
                    href={`/dashboard/customers/${target.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {target.name} 様
                        {target.kana && (
                          <span className="ml-1.5 text-xs font-normal text-gray-400">
                            {target.kana}
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        来店{formatNumber(target.visitCount)}回 ／ 最終来店:{" "}
                        {target.lastVisitLabel ?? "記録なし"}
                      </p>
                    </div>
                    <Badge variant={target.linked ? "default" : "secondary"} className="shrink-0">
                      {target.linked ? "LINE連携済み" : "LINE未連携"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hidden > 0 && (
          <p className="text-xs text-gray-500">
            先頭{formatNumber(SEGMENT_TARGET_PREVIEW_LIMIT)}人のみ表示しています（ほか
            {formatNumber(hidden)}人）。配信は対象のお客様全員にお届けします。
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              閉じる
            </Button>
          </DialogClose>
          <Link
            href={`/dashboard/campaigns/new?segmentId=${segmentId}`}
            className={cn(buttonVariants(), "w-full sm:w-auto")}
          >
            <Megaphone aria-hidden="true" />
            このセグメントに配信
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
