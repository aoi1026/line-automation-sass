import * as React from "react";
import { cn } from "@/lib/utils";

/** 読み込み中のプレースホルダー（ローディング表示用） */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      {...props}
    />
  );
}

export { Skeleton };
