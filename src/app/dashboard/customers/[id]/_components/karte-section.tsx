"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ClipboardList, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { KarteDeleteButton } from "./karte-delete-button";
import { KarteFormDialog, type StaffOption } from "./karte-form-dialog";

export type KarteRow = {
  id: string;
  /** "YYYY-MM-DD"（JST）。編集フォームの初期値に使用 */
  visitedAt: string;
  /** 「2026年8月26日(水)」 */
  visitedAtLabel: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  content: string;
  materials: string;
  nextNote: string;
  reservationId: string | null;
};

/** 折りたたみ判定のしきい値（文字数） */
const LONG_TEXT_LENGTH = 140;

function KarteField({
  label,
  value,
  clamped,
}: {
  label: string;
  value: string;
  clamped: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p
        className={cn(
          "mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800",
          clamped && "line-clamp-3"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function KarteTimelineItem({
  record,
  customerId,
  staffOptions,
  isLast,
}: {
  record: KarteRow;
  customerId: string;
  staffOptions: StaffOption[];
  isLast: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const isLong =
    record.content.length > LONG_TEXT_LENGTH ||
    record.materials.length > LONG_TEXT_LENGTH ||
    record.nextNote.length > LONG_TEXT_LENGTH;
  const clamped = isLong && !expanded;

  return (
    <li className={cn("relative pl-7", isLast ? "pb-0" : "pb-6")}>
      <span
        aria-hidden
        className="absolute left-0 top-1 size-3.5 rounded-full border-2 border-brand bg-white"
      />
      {!isLast && (
        <span aria-hidden className="absolute bottom-0 left-[6px] top-5 w-px bg-gray-200" />
      )}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h3 className="text-sm font-semibold text-gray-900">{record.visitedAtLabel}</h3>
        {record.serviceName && <Badge variant="secondary">{record.serviceName}</Badge>}
        {record.staffName && (
          <span className="text-xs text-gray-500">担当: {record.staffName}</span>
        )}
        {record.reservationId && (
          <Link
            href={`/dashboard/reservations/${record.reservationId}`}
            className="rounded-sm text-xs text-brand-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
          >
            この日の予約を見る
          </Link>
        )}
        <div className="ml-auto flex items-center gap-1">
          <KarteFormDialog
            mode="edit"
            customerId={customerId}
            recordId={record.id}
            staffOptions={staffOptions}
            initial={{
              visitedAt: record.visitedAt,
              serviceName: record.serviceName,
              staffId: record.staffId,
              content: record.content,
              materials: record.materials,
              nextNote: record.nextNote,
            }}
            trigger={
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-gray-400 hover:text-gray-700"
                aria-label={`${record.visitedAtLabel}のカルテを編集`}
              >
                <Pencil aria-hidden="true" />
              </Button>
            }
          />
          <KarteDeleteButton recordId={record.id} visitedAtLabel={record.visitedAtLabel} />
        </div>
      </div>

      <div className="mt-2 space-y-3">
        <KarteField label="施術内容" value={record.content} clamped={clamped} />
        {record.materials && (
          <KarteField label="使用薬剤・カラー剤" value={record.materials} clamped={clamped} />
        )}
        {record.nextNote && (
          <div className="rounded-lg bg-amber-50 px-3 py-2">
            <p className="text-xs font-medium text-amber-800">次回への申し送り</p>
            <p
              className={cn(
                "mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-amber-900",
                clamped && "line-clamp-3"
              )}
            >
              {record.nextNote}
            </p>
          </div>
        )}
        {isLong && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-3 text-gray-500"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
            {expanded ? "折りたたむ" : "すべて表示"}
          </Button>
        )}
      </div>
    </li>
  );
}

/** 顧客詳細のカルテ履歴（新しい順のタイムライン） */
export function KarteSection({
  customerId,
  records,
  staffOptions,
}: {
  customerId: string;
  records: KarteRow[];
  staffOptions: StaffOption[];
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1.5">
          <CardTitle role="heading" aria-level={2}>
            カルテ履歴
          </CardTitle>
          <CardDescription>
            ご来店ごとの施術記録です。新しいものから表示しています。
          </CardDescription>
        </div>
        <KarteFormDialog
          mode="create"
          customerId={customerId}
          staffOptions={staffOptions}
          trigger={
            <Button variant="outline" size="sm">
              <Plus aria-hidden="true" />
              カルテを追加
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <EmptyState
            icon={<ClipboardList aria-hidden="true" />}
            title="カルテがまだありません"
            description="施術内容や使用した薬剤を記録しておくと、次回のご来店で役立ちます。"
            action={
              <KarteFormDialog
                mode="create"
                customerId={customerId}
                staffOptions={staffOptions}
                trigger={
                  <Button size="sm">
                    <Plus aria-hidden="true" />
                    カルテを追加
                  </Button>
                }
              />
            }
          />
        ) : (
          <ol>
            {records.map((record, i) => (
              <KarteTimelineItem
                key={record.id}
                record={record}
                customerId={customerId}
                staffOptions={staffOptions}
                isLast={i === records.length - 1}
              />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
