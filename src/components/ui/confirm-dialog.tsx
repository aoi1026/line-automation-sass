"use client";
import * as React from "react";
import { AlertTriangle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ConfirmDialogProps {
  /** ダイアログの表示状態 */
  open: boolean;
  /** 表示状態の変更ハンドラ */
  onOpenChange: (open: boolean) => void;
  /** 見出し（体言止め。例:「予約を削除」） */
  title: string;
  /** 補足説明（丁寧語） */
  description?: React.ReactNode;
  /** 実行ボタンのラベル。省略時は「削除する」/「実行する」 */
  confirmLabel?: string;
  /** 取り消しボタンのラベル。省略時は「キャンセル」 */
  cancelLabel?: string;
  /** 実行時の処理。Promise を返すと完了までボタンが処理中表示になります */
  onConfirm: () => void | Promise<void>;
  /** 削除など取り消せない操作のとき true。実行ボタンが赤くなります */
  destructive?: boolean;
  /** 外部から処理中状態を制御する場合に指定 */
  loading?: boolean;
  /** ダイアログ本文に差し込む追加要素 */
  children?: React.ReactNode;
}

/**
 * window.confirm の置き換え用の確認ダイアログ。
 * 実行後にダイアログを閉じるかどうかは呼び出し側（onConfirm 内）で制御します。
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "キャンセル",
  onConfirm,
  destructive = false,
  loading,
  children,
}: ConfirmDialogProps) {
  const [pending, setPending] = React.useState(false);
  const busy = Boolean(loading) || pending;

  async function handleConfirm() {
    if (busy) return;
    try {
      setPending(true);
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // 処理中は誤操作で閉じないようにする
        if (busy && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={(e) => {
          if (busy) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (busy) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                destructive ? "bg-red-100 text-red-600" : "bg-brand/10 text-brand-dark"
              )}
            >
              {destructive ? <AlertTriangle className="h-5 w-5" /> : <HelpCircle className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1 pr-6">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription className="mt-1.5">{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={handleConfirm}
            loading={busy}
          >
            {confirmLabel ?? (destructive ? "削除する" : "実行する")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
