"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
export function CustomersTable({ rows }: { rows: CustomerRow[] }) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Users />}
        title="該当する顧客がいません"
        description="検索条件を変更するか、新しい顧客を登録してください。"
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
                  <p className="font-medium text-gray-900">{row.name}</p>
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
                <TableCell className="whitespace-nowrap text-right">{row.visitCount}回</TableCell>
                <TableCell className="whitespace-nowrap">
                  {row.lastVisitLabel ?? <span className="text-gray-400">-</span>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right">
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
            className="block rounded-lg border border-gray-200 p-4 active:bg-gray-50"
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
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>{row.phone || "-"}</span>
              <span>来店{row.visitCount}回</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>最終来店: {row.lastVisitLabel ?? "-"}</span>
              <span className="font-medium text-gray-700">{row.totalSpentLabel}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
