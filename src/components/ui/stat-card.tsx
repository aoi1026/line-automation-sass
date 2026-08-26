import * as React from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/** KPI表示用カード */
export function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  /** 前期間との比較。value は「+12.5%」など表示用の文字列 */
  trend?: { value: string; positive: boolean };
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-1.5 truncate text-2xl font-bold tracking-tight tabular-nums text-gray-900">{value}</p>
          {trend && (
            <p
              className={cn(
                "mt-1 flex items-center gap-1 text-xs font-medium",
                trend.positive ? "text-emerald-600" : "text-red-600"
              )}
            >
              {trend.positive ? (
                <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              )}
              <span className="sr-only">{trend.positive ? "増加" : "減少"}</span>
              <span className="truncate">{trend.value}</span>
            </p>
          )}
          {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
        </div>
        {icon && (
          <div
            aria-hidden="true"
            className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand [&_svg]:size-5")}
          >
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
