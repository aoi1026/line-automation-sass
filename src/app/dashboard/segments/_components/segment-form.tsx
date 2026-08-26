"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { toast } from "sonner";
import type { SegmentRules } from "@/lib/segments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { RuleBuilder, type RuleBuilderTag } from "../rule-builder";

export type SegmentFormValue = {
  id: string;
  name: string;
  rules: SegmentRules;
};

/** セグメントの作成・編集ダイアログ（対象人数のライブプレビューつき） */
export function SegmentFormDialog({
  open,
  onOpenChange,
  tags,
  segment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tags: RuleBuilderTag[];
  /** 編集対象。未指定なら新規作成 */
  segment?: SegmentFormValue | null;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [rules, setRules] = React.useState<SegmentRules>({});
  const [saving, setSaving] = React.useState(false);
  const [count, setCount] = React.useState<number | null>(null);
  const [counting, setCounting] = React.useState(false);
  const seqRef = React.useRef(0);

  React.useEffect(() => {
    if (open) {
      setName(segment?.name ?? "");
      setRules(segment?.rules ?? {});
      setCount(null);
    }
  }, [open, segment]);

  // 対象人数のライブプレビュー（デバウンス）
  const rulesJson = JSON.stringify(rules);
  React.useEffect(() => {
    if (!open) return;
    const seq = ++seqRef.current;
    setCounting(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/segments/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: `{"rules":${rulesJson}}`,
        });
        if (!res.ok) return;
        const data: { count: number } = await res.json();
        if (seqRef.current === seq) setCount(data.count);
      } finally {
        if (seqRef.current === seq) setCounting(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [open, rulesJson]);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("セグメント名を入力してください");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(segment ? `/api/segments/${segment.id}` : "/api/segments", {
        method: segment ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), rules }),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json().catch(() => ({}));
        toast.error(data.error ?? "保存に失敗しました");
        return;
      }
      toast.success(segment ? "セグメントを保存しました" : "セグメントを作成しました");
      onOpenChange(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{segment ? "セグメントを編集" : "セグメントを作成"}</DialogTitle>
          <DialogDescription>
            条件はすべて任意です。指定した条件をすべて満たすお客様が対象になります。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="segment-name">セグメント名</Label>
            <Input
              id="segment-name"
              placeholder="例: 離脱しかけのお客様"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <RuleBuilder value={rules} onChange={setRules} tags={tags} />

          <div className="flex items-center gap-2 rounded-lg bg-brand/5 px-4 py-3 text-sm">
            <Users className="h-4 w-4 text-brand" />
            {counting ? (
              <span className="flex items-center gap-2 text-gray-500">
                <Spinner className="h-4 w-4" />
                対象人数を計算しています…
              </span>
            ) : count !== null ? (
              <span className="text-gray-700">
                対象: <span className="font-bold text-brand-dark">{count.toLocaleString("ja-JP")}</span> 人
              </span>
            ) : (
              <span className="text-gray-500">対象: －</span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中…" : segment ? "保存" : "作成"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
