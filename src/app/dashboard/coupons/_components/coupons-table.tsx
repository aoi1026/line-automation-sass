"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Ticket } from "lucide-react";
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

/** クーポン一覧テーブル（行クリックで詳細へ、状態はインラインでPATCH） */
export function CouponsTable({ rows }: { rows: CouponRow[] }) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Ticket />}
        title="クーポンがまだありません"
        description="来店お礼や誕生日メッセージに添付できるクーポンを作成しましょう。"
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
                className="cursor-pointer"
                onClick={() => router.push(`/dashboard/coupons/${row.id}`)}
              >
                <TableCell className="font-medium text-gray-900">{row.title}</TableCell>
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
                  <CouponActiveSwitch couponId={row.id} active={row.active} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()} className="text-right">
                  <div className="flex justify-end gap-1">
                    <CouponFormDialog
                      couponId={row.id}
                      initial={row.editInitial}
                      trigger={
                        <Button type="button" variant="ghost" size="icon" aria-label="編集">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <DeleteCouponButton couponId={row.id} couponTitle={row.title} iconOnly />
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
