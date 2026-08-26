import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** 評価値を「★ 4.5」形式で表示（null は「-」） */
export function RatingValue({
  value,
  digits = 1,
  className,
}: {
  value: number | null | undefined;
  /** 小数桁数（平均: 1 / 個別回答: 0） */
  digits?: number;
  className?: string;
}) {
  if (value == null)
    return <span className={cn("text-gray-400", className)}>-</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium text-gray-900",
        className,
      )}
    >
      <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
      {value.toFixed(digits)}
    </span>
  );
}
