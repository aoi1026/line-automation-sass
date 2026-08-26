import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

/** KPI表示用カード */
export function StatCard({
  label,
  value,
  sub,
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
        </div>
        {icon && (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand [&_svg]:size-5")}>
            {icon}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
