"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DiscountType } from "@prisma/client";
import { DISCOUNT_TYPE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type CouponFormInitial = {
  title: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  code: string;
  validFrom: string; // "YYYY-MM-DD" or ""
  validUntil: string; // "YYYY-MM-DD" or ""
  usageLimit: number | null;
};

const EMPTY_INITIAL: CouponFormInitial = {
  title: "",
  description: "",
  discountType: "PERCENT",
  discountValue: 10,
  code: "",
  validFrom: "",
  validUntil: "",
  usageLimit: null,
};

const DISCOUNT_TYPES: DiscountType[] = ["PERCENT", "AMOUNT"];

/** クーポンの作成・編集ダイアログ（couponIdを指定すると編集モード） */
export function CouponFormDialog({
  couponId,
  initial,
  trigger,
}: {
  couponId?: string;
  initial?: CouponFormInitial;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const isEdit = couponId !== undefined;
  const base = initial ?? EMPTY_INITIAL;

  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState(base.title);
  const [description, setDescription] = React.useState(base.description);
  const [discountType, setDiscountType] = React.useState<DiscountType>(base.discountType);
  const [discountValue, setDiscountValue] = React.useState(String(base.discountValue));
  const [code, setCode] = React.useState(base.code);
  const [validFrom, setValidFrom] = React.useState(base.validFrom);
  const [validUntil, setValidUntil] = React.useState(base.validUntil);
  const [usageLimit, setUsageLimit] = React.useState(
    base.usageLimit != null ? String(base.usageLimit) : ""
  );
  const [saving, setSaving] = React.useState(false);

  function resetForm() {
    setTitle(base.title);
    setDescription(base.description);
    setDiscountType(base.discountType);
    setDiscountValue(String(base.discountValue));
    setCode(base.code);
    setValidFrom(base.validFrom);
    setValidUntil(base.validUntil);
    setUsageLimit(base.usageLimit != null ? String(base.usageLimit) : "");
  }

  function handleOpenChange(next: boolean) {
    if (next) resetForm();
    setOpen(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (title.trim() === "") {
      toast.error("クーポン名を入力してください");
      return;
    }
    const value = Number(discountValue);
    if (!Number.isInteger(value) || value < 1) {
      toast.error("割引値は1以上の整数で入力してください");
      return;
    }
    if (discountType === "PERCENT" && value > 100) {
      toast.error("％割引の割引値は1〜100の範囲で入力してください");
      return;
    }
    if (usageLimit !== "") {
      const limit = Number(usageLimit);
      if (!Number.isInteger(limit) || limit < 1) {
        toast.error("発行上限は1以上の整数で入力してください");
        return;
      }
    }
    if (validFrom && validUntil && validFrom > validUntil) {
      toast.error("有効期間の開始日は終了日以前にしてください");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(isEdit ? `/api/coupons/${couponId}` : "/api/coupons", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          discountType,
          discountValue: value,
          code: code.trim(),
          validFrom: validFrom || null,
          validUntil: validUntil || null,
          usageLimit: usageLimit === "" ? null : Number(usageLimit),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { id?: string; error?: string }
        | null;
      if (!res.ok) {
        toast.error(data?.error ?? "保存に失敗しました");
        return;
      }
      toast.success(isEdit ? "保存しました" : "クーポンを作成しました");
      setOpen(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "クーポンを編集" : "クーポンを作成"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "内容を変更して保存します。発行済みのクーポン表示にも反映されます。"
              : "お客様に配布するクーポンの内容を設定します。"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-title">クーポン名</Label>
            <Input
              id="coupon-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: ご来店ありがとうクーポン"
              maxLength={100}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-description">説明</Label>
            <Textarea
              id="coupon-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 全メニューでご利用いただけます。他のクーポンとの併用はできません。"
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>割引タイプ</Label>
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v as DiscountType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISCOUNT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DISCOUNT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-discount-value">割引値</Label>
              <div className="relative">
                <Input
                  id="coupon-discount-value"
                  type="number"
                  min={1}
                  max={discountType === "PERCENT" ? 100 : undefined}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="pr-8"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  {discountType === "PERCENT" ? "%" : "円"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-code">店頭確認コード</Label>
            <Input
              id="coupon-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="例: WELCOME10"
              maxLength={20}
              className="font-mono"
            />
            <p className="text-xs text-gray-500">
              未入力で保存すると英大文字+数字6桁を自動生成します。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-valid-from">有効期間（開始）</Label>
              <Input
                id="coupon-valid-from"
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="coupon-valid-until">有効期間（終了）</Label>
              <Input
                id="coupon-valid-until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-gray-500">どちらも空欄の場合は無期限になります。</p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="coupon-usage-limit">発行上限</Label>
            <Input
              id="coupon-usage-limit"
              type="number"
              min={1}
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder="空欄で無制限"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              キャンセル
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "保存中…" : isEdit ? "保存する" : "作成する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
