import * as React from "react";
import { cn } from "@/lib/utils";

/** データが空のときの表示 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 px-6 py-12 text-center", className)}>
      {icon && <div className="mb-1 text-gray-300 [&_svg]:size-10">{icon}</div>}
      <p className="font-medium text-gray-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
