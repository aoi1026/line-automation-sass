"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Filter, Megaphone, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import type { SegmentRules } from "@/lib/segments";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RuleBuilderTag } from "../rule-builder";
import { DeleteSegmentButton } from "./delete-segment-button";
import { SegmentFormDialog, type SegmentFormValue } from "./segment-form";
import { SegmentTargetsDialog } from "./segment-targets-dialog";
import type { SegmentTarget } from "./types";

export type SegmentItem = {
  id: string;
  name: string;
  rules: SegmentRules;
  /** describeRules の結果（サーバー側で整形済み） */
  description: string;
  /** 現在の対象人数（サーバー側で算出済み） */
  targetCount: number;
  /** 対象のお客様（先頭 SEGMENT_TARGET_PREVIEW_LIMIT 件まで） */
  targets: SegmentTarget[];
  /** 更新日（表示用整形済み） */
  updatedAtLabel: string;
};

/** セグメント一覧 + 作成・編集ダイアログ */
export function SegmentsClient({
  segments,
  tags,
}: {
  segments: SegmentItem[];
  tags: RuleBuilderTag[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SegmentFormValue | null>(null);
  const [duplicatingId, setDuplicatingId] = React.useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(item: SegmentItem) {
    setEditing({ id: item.id, name: item.name, rules: item.rules });
    setDialogOpen(true);
  }

  async function handleDuplicate(item: SegmentItem) {
    setDuplicatingId(item.id);
    try {
      const res = await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${item.name}のコピー`,
          rules: item.rules,
        }),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        toast.error(data.error ?? "複製に失敗しました");
        return;
      }
      toast.success("セグメントを複製しました");
      router.refresh();
    } finally {
      setDuplicatingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="セグメント"
        description="来店状況やタグでお客様を絞り込む条件を管理します。対象人数を押すと、対象のお客様を確認できます。"
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden="true" />
            セグメントを作成
          </Button>
        }
      />

      {segments.length === 0 ? (
        <EmptyState
          icon={<Filter aria-hidden="true" />}
          title="セグメントがまだありません"
          description="「最終来店から60日以上」などの条件でお客様を抽出できます。まずは、しばらくご来店のないお客様のセグメントを作ってみましょう。作成したセグメントはキャンペーンの配信対象に指定できます。"
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden="true" />
              セグメントを作成
            </Button>
          }
        />
      ) : (
        <>
          {/* デスクトップ: テーブル */}
          <Card className="hidden sm:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>セグメント名</TableHead>
                    <TableHead>条件</TableHead>
                    <TableHead>対象のお客様</TableHead>
                    <TableHead>更新日</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segments.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-gray-900">
                        {item.name}
                      </TableCell>
                      <TableCell className="max-w-[24rem] text-gray-600">
                        {item.description}
                      </TableCell>
                      <TableCell>
                        <SegmentTargetsDialog
                          segmentId={item.id}
                          segmentName={item.name}
                          description={item.description}
                          targetCount={item.targetCount}
                          targets={item.targets}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-gray-500">
                        {item.updatedAtLabel}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/campaigns/new?segmentId=${item.id}`}
                            aria-label={`セグメント「${item.name}」に配信する`}
                            className={cn(
                              buttonVariants({ variant: "ghost", size: "sm" }),
                              "h-11 text-brand-dark hover:bg-brand/10"
                            )}
                          >
                            <Megaphone aria-hidden="true" />
                            配信
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-11"
                            onClick={() => openEdit(item)}
                            aria-label={`セグメント「${item.name}」を編集`}
                          >
                            <Pencil aria-hidden="true" />
                            編集
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-11"
                            onClick={() => handleDuplicate(item)}
                            disabled={duplicatingId === item.id}
                            aria-label={`セグメント「${item.name}」を複製`}
                          >
                            <Copy aria-hidden="true" />
                            {duplicatingId === item.id ? "複製中…" : "複製"}
                          </Button>
                          <DeleteSegmentButton id={item.id} name={item.name} />
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
            {segments.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 font-medium text-gray-900">
                    {item.name}
                  </p>
                  <div className="shrink-0">
                    <SegmentTargetsDialog
                      segmentId={item.id}
                      segmentName={item.name}
                      description={item.description}
                      targetCount={item.targetCount}
                      targets={item.targets}
                    />
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-600">{item.description}</p>
                <p className="mt-1 text-xs text-gray-400">
                  更新日: {item.updatedAtLabel}
                </p>
                <div className="mt-3 flex flex-wrap justify-end gap-1 border-t border-gray-100 pt-3">
                  <Link
                    href={`/dashboard/campaigns/new?segmentId=${item.id}`}
                    aria-label={`セグメント「${item.name}」に配信する`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-11")}
                  >
                    <Megaphone aria-hidden="true" />
                    配信
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11"
                    onClick={() => openEdit(item)}
                    aria-label={`セグメント「${item.name}」を編集`}
                  >
                    <Pencil aria-hidden="true" />
                    編集
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-11"
                    onClick={() => handleDuplicate(item)}
                    disabled={duplicatingId === item.id}
                    aria-label={`セグメント「${item.name}」を複製`}
                  >
                    <Copy aria-hidden="true" />
                    {duplicatingId === item.id ? "複製中…" : "複製"}
                  </Button>
                  <DeleteSegmentButton id={item.id} name={item.name} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <SegmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tags={tags}
        segment={editing}
      />
    </>
  );
}
