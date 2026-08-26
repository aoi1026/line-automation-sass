"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { DistributionBar } from "./analytics-data";

/** 顧客の分布を横棒で表示する（任意で「この層に配信」リンクを添える） */
export function RetentionBars({
  data,
  unit = "人",
  linkLabel = "この層に配信",
}: {
  data: DistributionBar[];
  unit?: string;
  linkLabel?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="space-y-3">
      {data.map((bar) => (
        <div key={bar.label} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-xs font-medium text-gray-600">{bar.label}</span>
          <div className="h-2.5 min-w-8 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${(bar.count / max) * 100}%` }}
            />
          </div>
          <span className="w-14 shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-gray-600">
            {formatNumber(bar.count)}
            {unit}
          </span>
          {bar.href && bar.count > 0 && (
            <Link
              href={bar.href}
              className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs font-medium text-brand-dark hover:underline"
            >
              {linkLabel}
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
