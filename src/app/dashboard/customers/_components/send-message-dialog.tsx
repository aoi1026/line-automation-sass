"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/** 個別LINEメッセージ送信ダイアログ */
export function SendMessageDialog({
  customerId,
  customerName,
  linked,
  trigger,
}: {
  customerId: string;
  customerName: string;
  linked: boolean;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [content, setContent] = React.useState("");
  const [sending, setSending] = React.useState(false);

  async function handleSend() {
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, content: text }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "送信に失敗しました");
        return;
      }
      toast.success("送信しました");
      setContent("");
      setOpen(false);
      router.refresh();
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>メッセージを送信</DialogTitle>
          <DialogDescription>{customerName}様のLINEにメッセージを送信します。</DialogDescription>
        </DialogHeader>
        {!linked && (
          <p className="text-xs text-amber-600">
            このお客様はLINE未連携のため送信できません。連携後にご利用いただけます。
          </p>
        )}
        <Textarea
          rows={5}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="メッセージ本文を入力してください"
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={sending}>
              キャンセル
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !content.trim() || !linked}
          >
            <Send />
            {sending ? "送信中..." : "送信する"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
