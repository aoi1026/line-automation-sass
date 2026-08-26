"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StoreInfoData } from "./settings-tabs";

const SLOT_INTERVAL_OPTIONS = [15, 30, 60];

type FieldErrors = { name?: string; rebookingDays?: string };

export function StoreInfoForm({ storeInfo }: { storeInfo: StoreInfoData }) {
  const router = useRouter();
  const [name, setName] = useState(storeInfo.name);
  const [phone, setPhone] = useState(storeInfo.phone);
  const [address, setAddress] = useState(storeInfo.address);
  const [description, setDescription] = useState(storeInfo.description);
  const [slotIntervalMin, setSlotIntervalMin] = useState(String(storeInfo.slotIntervalMin));
  const [rebookingDays, setRebookingDays] = useState(String(storeInfo.defaultRebookingIntervalDays));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const copyReserveUrl = async () => {
    try {
      await navigator.clipboard.writeText(storeInfo.reserveUrl);
      toast.success("予約ページのURLをコピーしました");
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const save = async () => {
    const nextErrors: FieldErrors = {};
    if (!name.trim()) {
      nextErrors.name = "店舗名を入力してください";
    }
    const days = Number(rebookingDays);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      nextErrors.rebookingDays = "1〜365日の範囲で入力してください";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("入力内容をご確認ください");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          description,
          slotIntervalMin: Number(slotIntervalMin),
          defaultRebookingIntervalDays: days,
        }),
      });
      if (res.ok) {
        toast.success("店舗情報を保存しました");
        router.refresh();
      } else {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(body?.error ?? "保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>店舗情報</CardTitle>
          <CardDescription>お客様への表示や予約枠の計算に使用されます。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="store-name">
                店舗名
                <span className="ml-0.5 text-red-500" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="store-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="例: リピナビサロン 表参道店"
                required
                aria-required="true"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? "store-name-error" : undefined}
              />
              {errors.name && (
                <p id="store-name-error" role="alert" className="mt-1 text-xs text-red-600">
                  {errors.name}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="store-phone">電話番号</Label>
              <Input
                id="store-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="例: 03-1234-5678"
                aria-describedby="store-phone-help"
              />
              <p id="store-phone-help" className="mt-1 text-xs text-gray-500">
                Web予約ページとお客様への確認メッセージに表示されます。
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-address">住所</Label>
            <Input
              id="store-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="例: 東京都渋谷区神宮前1-2-3"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="store-description">紹介文</Label>
            <Textarea
              id="store-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="お店の特徴やこだわりをご記入ください。Web予約ページに表示されます。"
              aria-describedby="store-description-help"
            />
            <p id="store-description-help" className="mt-1 text-xs text-gray-500">
              Web予約ページの冒頭に表示されます。
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="store-slot-interval">予約枠の間隔</Label>
              <Select value={slotIntervalMin} onValueChange={setSlotIntervalMin}>
                <SelectTrigger id="store-slot-interval" aria-describedby="store-slot-interval-help">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_INTERVAL_OPTIONS.map((v) => (
                    <SelectItem key={v} value={String(v)}>
                      {v}分
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p id="store-slot-interval-help" className="mt-1 text-xs text-gray-500">
                Web予約ページで表示する時間の刻みです。30分なら10:00・10:30…と表示されます。
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="store-rebooking-days">
                再来店リマインドの標準間隔
                <span className="ml-0.5 text-red-500" aria-hidden="true">
                  *
                </span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="store-rebooking-days"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={365}
                  value={rebookingDays}
                  onChange={(e) => {
                    setRebookingDays(e.target.value);
                    if (errors.rebookingDays) {
                      setErrors((prev) => ({ ...prev, rebookingDays: undefined }));
                    }
                  }}
                  className="w-28"
                  required
                  aria-required="true"
                  aria-invalid={errors.rebookingDays ? true : undefined}
                  aria-describedby={
                    errors.rebookingDays
                      ? "store-rebooking-days-error store-rebooking-days-help"
                      : "store-rebooking-days-help"
                  }
                />
                <span className="text-sm text-gray-500">日</span>
              </div>
              {errors.rebookingDays && (
                <p
                  id="store-rebooking-days-error"
                  role="alert"
                  className="mt-1 text-xs text-red-600"
                >
                  {errors.rebookingDays}
                </p>
              )}
              <p id="store-rebooking-days-help" className="mt-1 text-xs text-gray-500">
                メニューごとの推奨間隔が未設定の場合に使用されます。
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Web予約ページ</CardTitle>
          <CardDescription>
            お客様が予約に使用するページのURLです。LINEのリッチメニューやSNSに掲載してご活用ください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Label htmlFor="store-reserve-url" className="sr-only">
              Web予約ページのURL
            </Label>
            <Input
              id="store-reserve-url"
              value={storeInfo.reserveUrl}
              readOnly
              className="bg-gray-50 font-mono text-xs sm:text-sm"
            />
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" onClick={copyReserveUrl}>
                <Copy aria-hidden="true" />
                コピー
              </Button>
              <a
                href={storeInfo.reserveUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                <ExternalLink aria-hidden="true" />
                開く
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
