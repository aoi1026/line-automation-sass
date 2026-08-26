"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { formatJstDateTime } from "@/lib/jst";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** LINE連携状況の表示・連携コード発行・連携解除カード */
export function LineLinkCard({
  customerId,
  linked,
  lineDisplayName,
  initialCode,
  initialExpiresAt,
}: {
  customerId: string;
  linked: boolean;
  lineDisplayName: string;
  /** 有効な既存コード（なければ null） */
  initialCode: string | null;
  /** コード有効期限（ISO文字列、なければ null） */
  initialExpiresAt: string | null;
}) {
  const router = useRouter();
  const [issuing, setIssuing] = React.useState(false);
  const [unlinking, setUnlinking] = React.useState(false);
  const [codeOpen, setCodeOpen] = React.useState(false);
  const [code, setCode] = React.useState(initialCode);
  const [expiresAt, setExpiresAt] = React.useState(initialExpiresAt);

  async function handleIssue() {
    if (issuing) return;
    setIssuing(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/link-code`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        code?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!res.ok || !data.code) {
        toast.error(data.error ?? "連携コードを発行できませんでした");
        return;
      }
      setCode(data.code);
      setExpiresAt(data.expiresAt ?? null);
      setCodeOpen(true);
      toast.success("連携コードを発行しました");
      router.refresh();
    } finally {
      setIssuing(false);
    }
  }

  async function handleUnlink() {
    if (!window.confirm("LINE連携を解除します。よろしいですか？")) return;
    setUnlinking(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink_line" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(data.error ?? "連携の解除に失敗しました");
        return;
      }
      toast.success("連携を解除しました");
      router.refresh();
    } finally {
      setUnlinking(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-brand" />
            LINE連携
            {linked && <Badge>連携済み</Badge>}
          </CardTitle>
          {!linked && (
            <CardDescription>
              お客様のLINEトークに連携コードを送信していただくと、LINEでのメッセージ配信が可能になります。
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {linked ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                LINE表示名:{" "}
                <span className="font-medium text-gray-900">
                  {lineDisplayName || "（表示名未取得）"}
                </span>
              </p>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50"
                onClick={() => void handleUnlink()}
                disabled={unlinking}
              >
                {unlinking ? "解除中..." : "連携を解除"}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button onClick={() => void handleIssue()} disabled={issuing}>
                {issuing ? "発行中..." : "連携コードを発行"}
              </Button>
              {code && (
                <div>
                  <button
                    type="button"
                    className="text-xs text-brand underline underline-offset-2"
                    onClick={() => setCodeOpen(true)}
                  >
                    発行済みのコードを表示
                  </button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={codeOpen} onOpenChange={setCodeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>LINE連携コード</DialogTitle>
            <DialogDescription>
              お客様にLINEトークでこのコードを送信していただくと連携が完了します。
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-center">
            <p className="text-4xl font-bold tracking-[0.3em] text-gray-900">{code}</p>
            <p className="mt-2 text-xs text-gray-500">
              有効期限: {expiresAt ? formatJstDateTime(new Date(expiresAt)) : "-"}（発行から24時間）
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
