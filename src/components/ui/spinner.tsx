import { Loader2, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

/** 読み込み中を示す回転アイコン（装飾のため既定でスクリーンリーダーからは隠す） */
export function Spinner({ className, ...props }: LucideProps) {
  return (
    <Loader2
      aria-hidden="true"
      className={cn("h-5 w-5 animate-spin text-gray-400", className)}
      {...props}
    />
  );
}
