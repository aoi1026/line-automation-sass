"use client";

import * as React from "react";
import type { SegmentRules } from "@/lib/segments";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type RuleBuilderTag = { id: string; name: string; color: string };

type NumericRuleKey =
  | "lastVisitDaysMin"
  | "lastVisitDaysMax"
  | "visitCountMin"
  | "visitCountMax"
  | "totalSpentMin";

const NONE = "none";

function parseNonNegativeInt(raw: string): number | undefined {
  if (raw.trim() === "") return undefined;
  const n = Math.trunc(Number(raw));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

/**
 * セグメント抽出条件の入力フォーム。
 * 空欄・未指定の条件は rules オブジェクトからキーごと取り除く。
 */
export function RuleBuilder({
  value,
  onChange,
  tags,
  /** 同一ページに複数配置する場合のid接頭辞 */
  idPrefix = "rule",
}: {
  value: SegmentRules;
  onChange: (rules: SegmentRules) => void;
  tags: RuleBuilderTag[];
  idPrefix?: string;
}) {
  function setNumber(key: NumericRuleKey, raw: string) {
    const next: SegmentRules = { ...value };
    const n = parseNonNegativeInt(raw);
    if (n === undefined) delete next[key];
    else next[key] = n;
    onChange(next);
  }

  function toggleTag(tagId: string) {
    const current = value.tagIds ?? [];
    const nextIds = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    const next: SegmentRules = { ...value };
    if (nextIds.length === 0) delete next.tagIds;
    else next.tagIds = nextIds;
    onChange(next);
  }

  function setBirthdayMonth(raw: string) {
    const next: SegmentRules = { ...value };
    if (raw === NONE) delete next.birthdayMonth;
    else next.birthdayMonth = Number(raw);
    onChange(next);
  }

  function setGender(raw: string) {
    const next: SegmentRules = { ...value };
    if (raw === NONE) delete next.gender;
    else next.gender = raw as "female" | "male";
    onChange(next);
  }

  function setHasLine(checked: boolean) {
    const next: SegmentRules = { ...value };
    if (checked) next.hasLine = true;
    else delete next.hasLine;
    onChange(next);
  }

  return (
    <div className="space-y-5">
      {/* 最終来店 */}
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-gray-700">
          最終来店からの日数
        </legend>
        <p id={`${idPrefix}-last-visit-help`} className="text-xs text-gray-500">
          最後にご来店いただいた日から今日までの日数で絞り込みます。「60日以上前」はしばらくご来店のないお客様、「30日以内」は最近ご来店のお客様です。
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-0.5">
          <div className="flex items-center gap-2">
            <Input
              id={`${idPrefix}-last-visit-min`}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="例: 60"
              className="w-24"
              value={value.lastVisitDaysMin ?? ""}
              onChange={(e) => setNumber("lastVisitDaysMin", e.target.value)}
              aria-label="最終来店から何日以上前か"
              aria-describedby={`${idPrefix}-last-visit-help`}
            />
            <Label
              htmlFor={`${idPrefix}-last-visit-min`}
              className="font-normal text-gray-600"
            >
              日以上前
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              id={`${idPrefix}-last-visit-max`}
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="例: 30"
              className="w-24"
              value={value.lastVisitDaysMax ?? ""}
              onChange={(e) => setNumber("lastVisitDaysMax", e.target.value)}
              aria-label="最終来店から何日以内か"
              aria-describedby={`${idPrefix}-last-visit-help`}
            />
            <Label
              htmlFor={`${idPrefix}-last-visit-max`}
              className="font-normal text-gray-600"
            >
              日以内
            </Label>
          </div>
        </div>
        <p className="text-xs text-gray-400">空欄にした条件は使用しません。</p>
      </fieldset>

      {/* 来店回数 */}
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-gray-700">来店回数</legend>
        <p
          id={`${idPrefix}-visit-count-help`}
          className="text-xs text-gray-500"
        >
          これまでにご来店いただいた回数の範囲です。「1回以上〜1回以下」で新規のお客様だけを抽出できます。
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <Input
            id={`${idPrefix}-visit-count-min`}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="最小"
            className="w-24"
            value={value.visitCountMin ?? ""}
            onChange={(e) => setNumber("visitCountMin", e.target.value)}
            aria-label="来店回数の下限"
            aria-describedby={`${idPrefix}-visit-count-help`}
          />
          <Label
            htmlFor={`${idPrefix}-visit-count-min`}
            className="font-normal text-gray-600"
          >
            回以上
          </Label>
          <span className="text-gray-300" aria-hidden="true">
            〜
          </span>
          <Input
            id={`${idPrefix}-visit-count-max`}
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="最大"
            className="w-24"
            value={value.visitCountMax ?? ""}
            onChange={(e) => setNumber("visitCountMax", e.target.value)}
            aria-label="来店回数の上限"
            aria-describedby={`${idPrefix}-visit-count-help`}
          />
          <Label
            htmlFor={`${idPrefix}-visit-count-max`}
            className="font-normal text-gray-600"
          >
            回以下
          </Label>
        </div>
      </fieldset>

      {/* 累計利用額 */}
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-total-spent`}>累計利用額</Label>
        <p
          id={`${idPrefix}-total-spent-help`}
          className="text-xs text-gray-500"
        >
          完了した予約の合計金額です。よくご利用いただいているお客様の抽出にお使いいただけます。
        </p>
        <div className="flex items-center gap-2 pt-0.5">
          <Input
            id={`${idPrefix}-total-spent`}
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            placeholder="例: 50000"
            className="w-32"
            value={value.totalSpentMin ?? ""}
            onChange={(e) => setNumber("totalSpentMin", e.target.value)}
            aria-describedby={`${idPrefix}-total-spent-help`}
          />
          <span className="text-sm text-gray-600">円以上</span>
        </div>
      </div>

      {/* タグ */}
      <fieldset className="space-y-1.5">
        <legend className="text-sm font-medium text-gray-700">タグ</legend>
        <p className="text-xs text-gray-500">
          選んだタグを<strong className="font-medium">すべて</strong>
          お持ちのお客様に絞り込みます。
        </p>
        {tags.length === 0 ? (
          <p className="text-sm text-gray-500">
            タグが未登録です。顧客管理のタグ設定から作成できます。
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-0.5">
            {tags.map((tag) => {
              const checked = (value.tagIds ?? []).includes(tag.id);
              return (
                <label
                  key={tag.id}
                  htmlFor={`${idPrefix}-tag-${tag.id}`}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    checked
                      ? "border-brand bg-brand/10 text-brand-dark"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50",
                  )}
                >
                  <Checkbox
                    id={`${idPrefix}-tag-${tag.id}`}
                    checked={checked}
                    onCheckedChange={() => toggleTag(tag.id)}
                    className="h-3.5 w-3.5"
                  />
                  <span
                    aria-hidden="true"
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </label>
              );
            })}
          </div>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* 誕生月 */}
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-birthday-month`}>誕生月</Label>
          <Select
            value={
              value.birthdayMonth !== undefined
                ? String(value.birthdayMonth)
                : NONE
            }
            onValueChange={setBirthdayMonth}
          >
            <SelectTrigger
              id={`${idPrefix}-birthday-month`}
              aria-describedby={`${idPrefix}-birthday-month-help`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>指定なし</SelectItem>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <SelectItem key={month} value={String(month)}>
                  {month}月
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p
            id={`${idPrefix}-birthday-month-help`}
            className="text-xs text-gray-500"
          >
            誕生日が登録されているお客様のみ対象になります。
          </p>
        </div>

        {/* 性別 */}
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-gender`}>性別</Label>
          <Select value={value.gender ?? NONE} onValueChange={setGender}>
            <SelectTrigger
              id={`${idPrefix}-gender`}
              aria-describedby={`${idPrefix}-gender-help`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>指定なし</SelectItem>
              <SelectItem value="female">女性</SelectItem>
              <SelectItem value="male">男性</SelectItem>
            </SelectContent>
          </Select>
          <p id={`${idPrefix}-gender-help`} className="text-xs text-gray-500">
            顧客情報に登録されている性別で絞り込みます。
          </p>
        </div>
      </div>

      {/* LINE連携 */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3">
        <div>
          <Label htmlFor={`${idPrefix}-has-line`}>LINE連携済みのみ</Label>
          <p
            id={`${idPrefix}-has-line-help`}
            className="mt-0.5 text-xs text-gray-500"
          >
            LINEを連携しているお客様に絞り込みます。メッセージを実際に届けられるのはこのお客様のみです。
          </p>
        </div>
        <Switch
          id={`${idPrefix}-has-line`}
          checked={value.hasLine === true}
          onCheckedChange={setHasLine}
          aria-describedby={`${idPrefix}-has-line-help`}
        />
      </div>
    </div>
  );
}
