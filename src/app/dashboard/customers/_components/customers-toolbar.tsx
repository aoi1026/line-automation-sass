"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TagManageDialog, type TagOption } from "./tag-manage-dialog";

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
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="名前・かな・電話番号で検索"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          検索
        </Button>
        <TagManageDialog tags={tags} />
      </form>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => apply(q, "")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              !initialTag
                ? "border-brand bg-brand/10 text-brand-dark"
                : "border-gray-200 text-gray-500 hover:bg-gray-50"
            )}
          >
            すべて
          </button>
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => apply(q, tag.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                initialTag === tag.id
                  ? "border-brand bg-brand/10 text-brand-dark"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
              {tag.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
