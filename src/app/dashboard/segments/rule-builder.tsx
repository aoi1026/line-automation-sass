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
}: {
  value: SegmentRules;
  onChange: (rules: SegmentRules) => void;
  tags: RuleBuilderTag[];
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
      <div className="space-y-1.5">
        <Label>最終来店</Label>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              placeholder="例: 60"
              className="w-24"
              value={value.lastVisitDaysMin ?? ""}
              onChange={(e) => setNumber("lastVisitDaysMin", e.target.value)}
            />
            <span className="text-sm text-gray-600">日以上前</span>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              placeholder="例: 30"
              className="w-24"
              value={value.lastVisitDaysMax ?? ""}
              onChange={(e) => setNumber("lastVisitDaysMax", e.target.value)}
            />
            <span className="text-sm text-gray-600">日以内</span>
          </div>
        </div>
        <p className="text-xs text-gray-400">空欄の場合はその条件を使用しません。</p>
      </div>

      {/* 来店回数 */}
      <div className="space-y-1.5">
        <Label>来店回数</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            placeholder="最小"
            className="w-24"
            value={value.visitCountMin ?? ""}
            onChange={(e) => setNumber("visitCountMin", e.target.value)}
          />
          <span className="text-sm text-gray-600">回以上</span>
          <span className="text-gray-300">〜</span>
          <Input
            type="number"
            min={0}
            placeholder="最大"
            className="w-24"
            value={value.visitCountMax ?? ""}
            onChange={(e) => setNumber("visitCountMax", e.target.value)}
          />
          <span className="text-sm text-gray-600">回以下</span>
        </div>
      </div>

      {/* 累計利用額 */}
      <div className="space-y-1.5">
        <Label>累計利用額</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            step={1000}
            placeholder="例: 50000"
            className="w-32"
            value={value.totalSpentMin ?? ""}
            onChange={(e) => setNumber("totalSpentMin", e.target.value)}
          />
          <span className="text-sm text-gray-600">円以上</span>
        </div>
      </div>

      {/* タグ */}
      <div className="space-y-1.5">
        <Label>タグ</Label>
        {tags.length === 0 ? (
          <p className="text-sm text-gray-400">
            タグが未登録です。顧客管理のタグ設定から作成できます。
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const checked = (value.tagIds ?? []).includes(tag.id);
              return (
                <label
                  key={tag.id}
                  htmlFor={`rule-tag-${tag.id}`}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    checked
                      ? "border-brand bg-brand/10 text-brand-dark"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Checkbox
                    id={`rule-tag-${tag.id}`}
                    checked={checked}
                    onCheckedChange={() => toggleTag(tag.id)}
                    className="h-3.5 w-3.5"
                  />
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* 誕生月 */}
        <div className="space-y-1.5">
          <Label>誕生月</Label>
          <Select
            value={value.birthdayMonth !== undefined ? String(value.birthdayMonth) : NONE}
            onValueChange={setBirthdayMonth}
          >
            <SelectTrigger>
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
        </div>

        {/* 性別 */}
        <div className="space-y-1.5">
          <Label>性別</Label>
          <Select value={value.gender ?? NONE} onValueChange={setGender}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>指定なし</SelectItem>
              <SelectItem value="female">女性</SelectItem>
              <SelectItem value="male">男性</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* LINE連携 */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
        <div>
          <Label htmlFor="rule-has-line">LINE連携済みのみ</Label>
          <p className="mt-0.5 text-xs text-gray-500">
            LINEアカウントを連携しているお客様に絞り込みます。
          </p>
        </div>
        <Switch
          id="rule-has-line"
          checked={value.hasLine === true}
          onCheckedChange={setHasLine}
        />
      </div>
    </div>
  );
}
