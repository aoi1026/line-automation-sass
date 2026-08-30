"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SurveyQuestion } from "@/app/api/surveys/schema";
import { cn, formatNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RatingValue } from "./rating-value";

export type SurveyRow = {
  id: string;
  title: string;
  description: string;
  thanksMessage: string;
  questions: SurveyQuestion[];
  questionCount: number;
  responseCount: number;
  avgRating: number | null;
  active: boolean;
  updatedLabel: string;
};

/** 一覧行の有効/無効スイッチ（即PATCH） */
function ActiveSwitch({
  surveyId,
  active,
  surveyTitle,
}: {
  surveyId: string;
  active: boolean;
  surveyTitle: string;
}) {
  const router = useRouter();
  const [checked, setChecked] = React.useState(active);
  const [pending, setPending] = React.useState(false);

  async function handleChange(next: boolean) {
    setChecked(next);
    setPending(true);
    try {
      const res = await fetch(`/api/surveys/${surveyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setChecked(!next);
        toast.error(data?.error ?? "更新に失敗しました");
        return;
      }
      toast.success(next ? "有効にしました" : "無効にしました");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Switch
      checked={checked}
      onCheckedChange={handleChange}
      disabled={pending}
      aria-label={`アンケート「${surveyTitle}」を有効にする`}
    />
  );
}

/** 一覧内のリンクに共通のフォーカスリング */
const LINK_FOCUS =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50";

/** アンケート一覧（sm以上: テーブル / sm未満: カード） */
export function SurveysTable({ rows }: { rows: SurveyRow[] }) {
  const router = useRouter();

  function open(id: string) {
    router.push(`/dashboard/surveys/${id}`);
  }
  const [deleteTarget, setDeleteTarget] = React.useState<SurveyRow | null>(
    null,
  );
  const [deleting, setDeleting] = React.useState(false);
  const [duplicatingId, setDuplicatingId] = React.useState<string | null>(null);

  async function handleDuplicate(row: SurveyRow) {
    setDuplicatingId(row.id);
    try {
      const res = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${row.title}（コピー）`,
          description: row.description,
          thanksMessage: row.thanksMessage,
          questions: row.questions,
          active: false,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "複製に失敗しました");
        return;
      }
      toast.success(
        "複製しました。複製したアンケートは無効の状態で作成されます。",
      );
      router.refresh();
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/surveys/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "削除に失敗しました");
        return;
      }
      toast.success("削除しました");
      setDeleteTarget(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  /** 表・カードで共通の操作メニュー */
  function renderRowMenu(row: SurveyRow) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`「${row.title}」の操作メニュー`}
          >
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => router.push(`/dashboard/surveys/${row.id}/edit`)}
          >
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
            編集
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push(`/dashboard/surveys/${row.id}`)}
          >
            <BarChart3 className="mr-2 h-4 w-4" aria-hidden="true" />
            回答を見る
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={duplicatingId === row.id}
            onClick={() => handleDuplicate(row)}
          >
            <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
            {duplicatingId === row.id ? "複製中…" : "複製"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            削除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      {/* デスクトップ: テーブル */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>アンケート名</TableHead>
                <TableHead className="text-right">質問数</TableHead>
                <TableHead className="text-right">回答数</TableHead>
                <TableHead>平均評価</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>更新日</TableHead>
                <TableHead className="w-14 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  tabIndex={0}
                  aria-label={`${row.title}の回答を見る`}
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
                  <TableCell>
                    <span className="font-medium text-gray-900">
                      {row.title}
                    </span>
                    {row.description !== "" && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                        {row.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-gray-600">
                    {formatNumber(row.questionCount)}
                  </TableCell>
                  <TableCell className="text-right text-gray-600">
                    {formatNumber(row.responseCount)}
                  </TableCell>
                  <TableCell>
                    <RatingValue value={row.avgRating} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <ActiveSwitch
                      surveyId={row.id}
                      active={row.active}
                      surveyTitle={row.title}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-gray-600">
                    {row.updatedLabel}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {renderRowMenu(row)}
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
              <div className="min-w-0 flex-1">
                <Link
                  href={`/dashboard/surveys/${row.id}`}
                  className={cn(
                    "block truncate font-medium text-gray-900 hover:text-brand-dark hover:underline",
                    LINK_FOCUS,
                  )}
                >
                  {row.title}
                </Link>
                {row.description !== "" && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                    {row.description}
                  </p>
                )}
              </div>
              {renderRowMenu(row)}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
              <span className="tabular-nums">
                質問 {formatNumber(row.questionCount)}
              </span>
              <span className="tabular-nums">
                回答 {formatNumber(row.responseCount)}
              </span>
              <RatingValue value={row.avgRating} className="text-xs" />
              <span className="ml-auto text-gray-400">{row.updatedLabel}</span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
              <span className="text-xs text-gray-500">
                {row.active ? "回答を受け付け中" : "停止中"}
              </span>
              <ActiveSwitch
                surveyId={row.id}
                active={row.active}
                surveyTitle={row.title}
              />
            </div>
          </Card>
        ))}
      </div>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アンケートを削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.title}
              」を削除します。これまでにいただいた回答
              {deleteTarget ? formatNumber(deleteTarget.responseCount) : "0"}
              件と、お客様にお送りした回答ページのリンクもすべて削除され、回答できなくなります。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "削除中…" : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
