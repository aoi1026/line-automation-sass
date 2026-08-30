"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TagManageDialog, type TagOption } from "./tag-manage-dialog";
import { CustomersExportButton } from "./customers-export-button";

/** タグ絞り込みチップの共通クラス */
const CHIP_CLASS =
  "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50";
const CHIP_ON = "border-brand bg-brand/10 text-brand-dark";
const CHIP_OFF = "border-gray-200 text-gray-500 hover:bg-gray-50";

/** 顧客一覧の検索・タグ絞り込みツールバー */
export function CustomersToolbar({
  tags,
  initialQ,
  initialTag,
}: {
  tags: TagOption[];
  initialQ: string;
  initialTag: string;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState(initialQ);

  function apply(nextQ: string, nextTag: string) {
    // 絞り込みを変えたら結果の並びが変わるため、ページ番号は引き継がず1ページ目に戻す
    const params = new URLSearchParams();
    const trimmed = nextQ.trim();
    if (trimmed) params.set("q", trimmed);
    if (nextTag) params.set("tag", nextTag);
    const qs = params.toString();
    router.push(`/dashboard/customers${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="space-y-3">
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-center"
        onSubmit={(e) => {
          e.preventDefault();
          apply(q, initialTag);
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Label htmlFor="customers-search" className="sr-only">
            お客様を検索
          </Label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          />
          <Input
            id="customers-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="名前・かな・電話番号で検索"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="outline">
            検索
          </Button>
          <TagManageDialog tags={tags} />
          {/* 書き出しは画面の絞り込み（検索・タグ）をそのまま引き継ぐ */}
          <CustomersExportButton q={initialQ} tagId={initialTag} />
          {/* 取り込み口はインポートウィザードに一本化している */}
          <Link
            href="/dashboard/customers/import"
            className={buttonVariants({ variant: "outline" })}
          >
            <Upload aria-hidden="true" />
            CSVで取り込み
          </Link>
        </div>
      </form>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="タグで絞り込み">
          <button
            type="button"
            onClick={() => apply(q, "")}
            aria-pressed={!initialTag}
            className={cn(CHIP_CLASS, !initialTag ? CHIP_ON : CHIP_OFF)}
          >
            すべて
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => apply(q, tag.id)}
              aria-pressed={initialTag === tag.id}
              className={cn(CHIP_CLASS, initialTag === tag.id ? CHIP_ON : CHIP_OFF)}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
