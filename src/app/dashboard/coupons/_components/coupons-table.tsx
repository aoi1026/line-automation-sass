"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
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

/** 一覧内のリンクに共通のフォーカスリング */
const LINK_FOCUS =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50";

/** クーポン一覧（sm以上: テーブル / sm未満: カード。行クリック・Enterキーで詳細へ、状態はインラインでPATCH） */
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
    <>
      {/* デスクトップ: テーブル */}
      <Card className="hidden sm:block">
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

      {/* モバイル: カード（操作ボタンが画面外に出ないよう縦に並べる） */}
      <div className="space-y-3 sm:hidden">
        {rows.map((row) => (
          <Card key={row.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/dashboard/coupons/${row.id}`}
                  className={cn(
                    "block truncate font-medium text-gray-900 hover:text-brand-dark hover:underline",
                    LINK_FOCUS
                  )}
                >
                  {row.title}
                </Link>
                <p className="mt-0.5 text-sm text-gray-600">{row.discountLabel}</p>
              </div>
              <CouponActiveSwitch
                couponId={row.id}
                active={row.active}
                couponTitle={row.title}
              />
            </div>

            <dl className="mt-3 space-y-1 text-xs text-gray-600">
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-gray-500">コード</dt>
                <dd className="min-w-0 truncate font-mono">{row.code || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-gray-500">有効期間</dt>
                <dd className="min-w-0">{row.validityLabel}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-gray-500">発行/上限</dt>
                <dd className="min-w-0 tabular-nums">
                  {row.issuedCount} / {row.usageLimit ?? "無制限"}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 text-gray-500">利用数</dt>
                <dd className="min-w-0 tabular-nums">{row.usedCount}</dd>
              </div>
            </dl>

            <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-3">
              <CouponFormDialog
                couponId={row.id}
                initial={row.editInitial}
                trigger={
                  <Button type="button" variant="outline" size="sm" className="h-11">
                    <Pencil aria-hidden="true" />
                    編集
                  </Button>
                }
              />
              <DeleteCouponButton couponId={row.id} couponTitle={row.title} />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
