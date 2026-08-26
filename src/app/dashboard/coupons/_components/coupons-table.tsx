"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CouponActiveSwitch } from "./coupon-active-switch";
import { CouponFormDialog, type CouponFormInitial } from "./coupon-form-dialog";
import { DeleteCouponButton } from "./delete-coupon-button";

export type CouponRow = {
  id: string;
  title: string;
  discountLabel: string;
  code: string;
  validityLabel: string;
  issuedCount: number;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
  editInitial: CouponFormInitial;
};

/** クーポン一覧テーブル（行クリック・Enterキーで詳細へ、状態はインラインでPATCH） */
export function CouponsTable({ rows }: { rows: CouponRow[] }) {
  const router = useRouter();

  function open(id: string) {
    router.push(`/dashboard/coupons/${id}`);
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Ticket aria-hidden="true" />}
        title="クーポンがまだありません"
        description="来店お礼や誕生日メッセージに添付できるクーポンを作成しましょう。右上の「クーポンを作成」から登録できます。"
        action={
          <CouponFormDialog
            trigger={
              <Button type="button">
                <Plus aria-hidden="true" />
                クーポンを作成
              </Button>
            }
          />
        }
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>クーポン名</TableHead>
              <TableHead>割引</TableHead>
              <TableHead>コード</TableHead>
              <TableHead>有効期間</TableHead>
              <TableHead className="text-right">発行数/上限</TableHead>
              <TableHead className="text-right">利用数</TableHead>
              <TableHead>状態</TableHead>
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
                <TableCell className="font-medium text-gray-900">
                  {row.title}
                </TableCell>
                <TableCell className="whitespace-nowrap text-gray-700">
                  {row.discountLabel}
                </TableCell>
                <TableCell className="whitespace-nowrap font-mono text-xs text-gray-600">
                  {row.code || "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-gray-600">
                  {row.validityLabel}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-gray-600">
                  {row.issuedCount} / {row.usageLimit ?? "∞"}
                </TableCell>
                <TableCell className="whitespace-nowrap text-right text-gray-600">
                  {row.usedCount}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <CouponActiveSwitch
                    couponId={row.id}
                    active={row.active}
                    couponTitle={row.title}
                  />
                </TableCell>
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                  className="text-right"
                >
                  <div className="flex justify-end gap-1">
                    <CouponFormDialog
                      couponId={row.id}
                      initial={row.editInitial}
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`「${row.title}」を編集`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      }
                    />
                    <DeleteCouponButton
                      couponId={row.id}
                      couponTitle={row.title}
                      iconOnly
                    />
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
