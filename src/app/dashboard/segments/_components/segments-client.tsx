"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Copy, Filter, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import type { SegmentRules } from "@/lib/segments";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export type SegmentItem = {
  id: string;
  name: string;
  rules: SegmentRules;
  /** describeRules の結果（サーバー側で整形済み） */
  description: string;
  /** 現在の対象人数（サーバー側で算出済み） */
  targetCount: number;
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
        description="来店状況やタグでお客様を絞り込む条件を管理します。キャンペーンの配信対象に使えます。"
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
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>セグメント名</TableHead>
                  <TableHead>条件</TableHead>
                  <TableHead>対象人数</TableHead>
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
                      <Badge variant="secondary">
                        {formatNumber(item.targetCount)}人
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-gray-500">
                      {item.updatedAtLabel}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
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
