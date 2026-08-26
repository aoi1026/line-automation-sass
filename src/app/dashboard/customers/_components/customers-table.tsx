"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, SearchX, Users } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CustomerFormDialog } from "./customer-form-dialog";

export type CustomerRow = {
  id: string;
  name: string;
  kana: string;
  phone: string;
  tags: { id: string; name: string; color: string }[];
  lastVisitLabel: string | null;
  visitCount: number;
  totalSpentLabel: string;
  linked: boolean;
};

function TagChips({ tags }: { tags: CustomerRow["tags"] }) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${tag.color}1f`, color: tag.color }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}

function LineBadge({ linked }: { linked: boolean }) {
  return linked ? <Badge>連携済み</Badge> : <Badge variant="secondary">未連携</Badge>;
}

/** 顧客一覧テーブル（デスクトップ: 表、モバイル: カード） */
export function CustomersTable({
  rows,
  hasFilter = false,
}: {
  rows: CustomerRow[];
  /** 検索・タグで絞り込み中か（空状態の文言を切り替える） */
  hasFilter?: boolean;
}) {
  const router = useRouter();

  if (rows.length === 0) {
    if (hasFilter) {
      return (
        <EmptyState
          icon={<SearchX aria-hidden="true" />}
          title="条件に合うお客様が見つかりません"
          description="検索キーワードを短くするか、タグの絞り込みを外してお試しください。"
          action={
            <Link
              href="/dashboard/customers"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              絞り込みを解除
            </Link>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={<Users aria-hidden="true" />}
        title="お客様がまだ登録されていません"
        description="お客様を登録すると、来店履歴の記録やLINEでのメッセージ配信ができるようになります。"
        action={
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <CustomerFormDialog
              mode="create"
              trigger={
                <Button size="sm">
                  <Plus aria-hidden="true" />
                  顧客を登録
                </Button>
              }
            />
            <Link
              href="/dashboard/customers/import"
              className="text-sm font-medium text-brand-dark underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
            >
              CSVから取り込む
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <>
      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>氏名</TableHead>
              <TableHead>電話</TableHead>
              <TableHead>LINE</TableHead>
              <TableHead>タグ</TableHead>
              <TableHead className="text-right">来店回数</TableHead>
              <TableHead>最終来店</TableHead>
              <TableHead className="text-right">累計利用額</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/customers/${row.id}`)}
              >
                <TableCell>
                  {/* 行全体もクリックできるが、キーボード操作はこのリンクで行う */}
                  <Link
                    href={`/dashboard/customers/${row.id}`}
                    className={cn(
                      "font-medium text-gray-900 hover:text-brand-dark hover:underline",
                      "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                    )}
                  >
                    {row.name}
                  </Link>
                  {row.kana && <p className="mt-0.5 text-xs text-gray-400">{row.kana}</p>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-gray-600">
                  {row.phone || <span className="text-gray-400">-</span>}
                </TableCell>
                <TableCell>
                  <LineBadge linked={row.linked} />
                </TableCell>
                <TableCell>
                  <TagChips tags={row.tags} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {formatNumber(row.visitCount)}回
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.lastVisitLabel ?? <span className="text-gray-400">-</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right tabular-nums">
                  {row.totalSpentLabel}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <Link
            key={row.id}
            href={`/dashboard/customers/${row.id}`}
            className="block rounded-lg border border-gray-200 p-4 active:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-medium text-gray-900">{row.name}</p>
                {row.kana && <p className="truncate text-xs text-gray-400">{row.kana}</p>}
              </div>
              <LineBadge linked={row.linked} />
            </div>
            {row.tags.length > 0 && (
              <div className="mt-2">
                <TagChips tags={row.tags} />
              </div>
            )}
            <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-500">
              <span className="truncate">{row.phone || "電話番号未登録"}</span>
              <span className="shrink-0 tabular-nums">
                来店{formatNumber(row.visitCount)}回
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-500">
              <span className="truncate">最終来店: {row.lastVisitLabel ?? "記録なし"}</span>
              <span className="shrink-0 font-medium tabular-nums text-gray-700">
                {row.totalSpentLabel}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
