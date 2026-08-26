"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SurveyQuestion } from "@/app/api/surveys/schema";
import { formatNumber } from "@/lib/utils";
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
function ActiveSwitch({ surveyId, active }: { surveyId: string; active: boolean }) {
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
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
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
      aria-label="アンケートの有効/無効"
    />
  );
}

export function SurveysTable({ rows }: { rows: SurveyRow[] }) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = React.useState<SurveyRow | null>(null);
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
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "複製に失敗しました");
        return;
      }
      toast.success("複製しました。複製したアンケートは無効の状態で作成されます。");
      router.refresh();
    } finally {
      setDuplicatingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/surveys/${deleteTarget.id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
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

  return (
    <>
      <Card>
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
                  className="cursor-pointer"
                  onClick={() => router.push(`/dashboard/surveys/${row.id}`)}
                >
                  <TableCell>
                    <span className="font-medium text-gray-900">{row.title}</span>
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
                    <ActiveSwitch surveyId={row.id} active={row.active} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-gray-600">
                    {row.updatedLabel}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="操作メニュー"
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/dashboard/surveys/${row.id}/edit`)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          編集
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push(`/dashboard/surveys/${row.id}`)}
                        >
                          <BarChart3 className="mr-2 h-4 w-4" />
                          回答を見る
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={duplicatingId === row.id}
                          onClick={() => handleDuplicate(row)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          複製
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          削除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>アンケートを削除</DialogTitle>
            <DialogDescription>
              「{deleteTarget?.title}
              」を削除しますか？これまでの回答データ・送信済みの回答依頼リンクもすべて削除されます。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "削除中…" : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
