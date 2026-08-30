import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        // モバイルは16px(text-base)、sm以上は従来どおり14px。iOS Safari は16px未満の入力欄にフォーカスすると自動ズームするため
        "flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base sm:text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-50",
        // 入力エラー時（aria-invalid="true"）は境界線とフォーカスリングを赤にする
        "aria-invalid:border-red-500 aria-invalid:ring-red-500/30 aria-invalid:focus-visible:ring-red-500/40",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
