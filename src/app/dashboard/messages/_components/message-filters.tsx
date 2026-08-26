"use client";

import { useRouter } from "next/navigation";
import type { MessageChannel, MessageKind, MessageStatus } from "@prisma/client";
import {
  MESSAGE_CHANNEL_LABELS,
  MESSAGE_KIND_LABELS,
  MESSAGE_STATUS_LABELS,
} from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const KIND_OPTIONS = Object.keys(MESSAGE_KIND_LABELS) as MessageKind[];
const STATUS_OPTIONS = Object.keys(MESSAGE_STATUS_LABELS) as MessageStatus[];
const CHANNEL_OPTIONS = Object.keys(MESSAGE_CHANNEL_LABELS) as MessageChannel[];

/** メッセージ履歴の絞り込み（種別・ステータス・チャネル）。変更時にURLクエリを更新する（1ページ目に戻る） */
export function MessageFilters({
  kind,
  status,
  channel,
}: {
  kind: string;
  status: string;
  channel: string;
}) {
  const router = useRouter();

  function update(next: { kind?: string; status?: string; channel?: string }) {
    const k = next.kind ?? kind;
    const s = next.status ?? status;
    const c = next.channel ?? channel;
    const params = new URLSearchParams();
    if (k !== "all") params.set("kind", k);
    if (s !== "all") params.set("status", s);
    if (c !== "all") params.set("channel", c);
    const qs = params.toString();
    router.push(qs ? `/dashboard/messages?${qs}` : "/dashboard/messages");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={kind} onValueChange={(v) => update({ kind: v })}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="種別" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべての種別</SelectItem>
          {KIND_OPTIONS.map((k) => (
            <SelectItem key={k} value={k}>
              {MESSAGE_KIND_LABELS[k]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => update({ status: v })}>
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue placeholder="ステータス" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべてのステータス</SelectItem>
          {STATUS_OPTIONS.map((s) => (
            <SelectItem key={s} value={s}>
              {MESSAGE_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={channel} onValueChange={(v) => update({ channel: v })}>
        <SelectTrigger className="w-full sm:w-40">
          <SelectValue placeholder="チャネル" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべてのチャネル</SelectItem>
          {CHANNEL_OPTIONS.map((c) => (
            <SelectItem key={c} value={c}>
              {MESSAGE_CHANNEL_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
