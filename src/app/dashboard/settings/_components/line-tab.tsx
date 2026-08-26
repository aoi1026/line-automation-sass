"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Copy, ExternalLink, Send, TriangleAlert, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { LineInfo } from "./settings-tabs";

/** 接続テストの送信先候補（GET /api/customers の結果から必要な項目のみ利用） */
type LinkedCustomer = { id: string; name: string; kana: string };

export function LineTab({ line }: { line: LineInfo }) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [basicId, setBasicId] = useState(line.basicId);
  const [saving, setSaving] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [linkedCustomers, setLinkedCustomers] = useState<LinkedCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customersError, setCustomersError] = useState(false);
  const [testCustomerId, setTestCustomerId] = useState("");
  const [testing, setTesting] = useState(false);

  // 一覧APIにLINE連携での絞り込みがないため、取得した顧客をクライアント側で絞り込む
  const loadLinkedCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    setCustomersError(false);
    try {
      const res = await fetch("/api/customers");
      if (!res.ok) {
        setCustomersError(true);
        return;
      }
      const data = (await res.json()) as (LinkedCustomer & { lineUserId: string | null })[];
      setLinkedCustomers(
        data
          .filter((c) => Boolean(c.lineUserId))
          .map((c) => ({ id: c.id, name: c.name, kana: c.kana }))
      );
    } catch {
      setCustomersError(true);
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    if (!line.configured) return;
    void loadLinkedCustomers();
  }, [line.configured, loadLinkedCustomers]);

  const sendTest = async () => {
    if (!testCustomerId || testing) return;
    setTesting(true);
    try {
      const res = await fetch("/api/line/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: testCustomerId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        channel?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "テストメッセージの送信に失敗しました");
        return;
      }
      // HTTPは200でも送信自体が失敗している場合があるため、送信結果も確認する
      if (data.status !== "SENT") {
        toast.error(data.error || "テストメッセージの送信に失敗しました");
        return;
      }
      toast.success("テストメッセージを送信しました");
      router.refresh();
    } catch {
      toast.error("通信に失敗しました。もう一度お試しください");
    } finally {
      setTesting(false);
    }
  };

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(line.webhookUrl);
      toast.success("Webhook URLをコピーしました");
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const save = async () => {
    if (!line.configured && !token.trim()) {
      toast.error("Channel Access Tokenを入力してください");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 空文字は「変更しない」扱い（サーバー側でスキップ）
          lineChannelAccessToken: token.trim(),
          lineChannelSecret: secret.trim(),
          lineBasicId: basicId.trim(),
        }),
      });
      if (res.ok) {
        toast.success("LINE連携設定を保存しました");
        setToken("");
        setSecret("");
        router.refresh();
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  };

  const unlink = async () => {
    setUnlinking(true);
    try {
      const res = await fetch("/api/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlink_line" }),
      });
      if (res.ok) {
        toast.success("LINE連携を解除しました");
        setUnlinkOpen(false);
        setToken("");
        setSecret("");
        setBasicId("");
        router.refresh();
      } else {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        toast.error(data?.error ?? "解除に失敗しました");
      }
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ステータスバナー */}
      {line.configured ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="text-sm text-emerald-800">
            <p className="font-semibold">LINE連携済み</p>
            <p className="mt-0.5">メッセージはLINEで実送信されます。</p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">デモモードで動作中</p>
            <p className="mt-0.5">
              メッセージは実送信されず、メッセージ履歴にのみ記録されます。LINEチャネルを設定すると実送信に切り替わります。
            </p>
          </div>
        </div>
      )}

      {/* チャネル設定フォーム */}
      <Card>
        <CardHeader>
          <CardTitle>チャネル設定</CardTitle>
          <CardDescription>
            LINE Developersで発行したMessaging APIチャネルの情報を設定します。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="line-token">Channel Access Token</Label>
            <Textarea
              id="line-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              rows={3}
              placeholder={
                line.configured
                  ? "設定済み。変更する場合のみ入力"
                  : "Channel Access Token（長期）を入力"
              }
              className="font-mono text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="line-secret">Channel Secret</Label>
            <Input
              id="line-secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder={
                line.configured ? "設定済み。変更する場合のみ入力" : "Channel Secretを入力"
              }
              className="font-mono"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="line-basic-id">LINE Basic ID</Label>
            <Input
              id="line-basic-id"
              value={basicId}
              onChange={(e) => setBasicId(e.target.value)}
              placeholder="@123abcde"
              className="max-w-xs"
            />
            <p className="text-xs text-gray-500">友だち追加のご案内リンクに使用されます。</p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            {line.configured ? (
              <Button
                variant="outline"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setUnlinkOpen(true)}
              >
                <Unlink />
                連携を解除
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={save} disabled={saving}>
              {saving ? "保存中…" : "保存"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook URL</CardTitle>
          <CardDescription>
            LINE DevelopersコンソールのWebhook設定に、このURLを登録してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={line.webhookUrl}
              readOnly
              className="bg-gray-50 font-mono text-xs sm:text-sm"
            />
            <Button variant="outline" onClick={copyWebhookUrl} className="shrink-0">
              <Copy />
              コピー
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 接続テスト（LINE連携済みのときのみ表示） */}
      {line.configured && (
        <Card>
          <CardHeader>
            <CardTitle>接続テスト</CardTitle>
            <CardDescription>
              選択したお客様のLINEへ、実際にテストメッセージが送信されます。設定が正しく完了しているかをご確認いただけます。
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {loadingCustomers ? (
              <p className="text-sm text-gray-500">送信先のお客様を読み込んでいます…</p>
            ) : customersError ? (
              <div className="flex flex-col items-start gap-2">
                <p className="text-sm text-gray-500">
                  お客様の一覧を読み込めませんでした。お手数ですが、もう一度お試しください。
                </p>
                <Button variant="outline" onClick={() => void loadLinkedCustomers()}>
                  再読み込み
                </Button>
              </div>
            ) : linkedCustomers.length === 0 ? (
              <p className="text-sm text-gray-500">
                LINE連携済みのお客様がいないため、テスト送信できません。お客様に友だち追加していただくと、こちらから送信先を選べるようになります。
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="line-test-customer">送信先のお客様</Label>
                  <Select value={testCustomerId} onValueChange={setTestCustomerId}>
                    <SelectTrigger id="line-test-customer" className="max-w-sm">
                      <SelectValue placeholder="LINE連携済みのお客様を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {linkedCustomers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                          {customer.kana ? `（${customer.kana}）` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    LINE連携済みのお客様のみ表示しています。テスト用の文面が1通送信されます。
                  </p>
                </div>
                <div>
                  <Button onClick={sendTest} disabled={!testCustomerId || testing}>
                    <Send />
                    {testing ? "送信中…" : "テストを送信"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* セットアップ手順 */}
      <Card>
        <CardHeader>
          <CardTitle>連携手順</CardTitle>
          <CardDescription>初めて設定する場合は、以下の手順で進めてください。</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-gray-700">
            <li>LINE DevelopersでMessaging APIチャネルを作成します。</li>
            <li>Channel Access Token（長期）とChannel Secretを取得し、上のフォームで保存します。</li>
            <li>上記のWebhook URLをチャネルのWebhook設定に登録し、Webhookを有効化します。</li>
            <li>LINE公式アカウントの応答メッセージをオフにします。</li>
          </ol>
          <a
            href="https://developers.line.biz/"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            LINE Developersを開く
          </a>
        </CardContent>
      </Card>

      {/* 連携解除の確認ダイアログ */}
      <Dialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>連携を解除</DialogTitle>
            <DialogDescription>
              Channel Access TokenとChannel Secretを削除し、デモモードに戻ります。メッセージは実送信されなくなりますが、よろしいですか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkOpen(false)} disabled={unlinking}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={unlink} disabled={unlinking}>
              {unlinking ? "解除中…" : "解除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
