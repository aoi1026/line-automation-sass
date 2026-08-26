import { StickyNote } from "lucide-react";

/**
 * 前回の申し送り（最新のカルテの nextNote）。
 * 接客前に必ず目に入るよう、顧客詳細の上部で目立たせて表示する。
 */
export function NextNoteCard({
  note,
  visitedAtLabel,
  serviceName,
  staffName,
}: {
  note: string;
  visitedAtLabel: string;
  serviceName: string;
  staffName: string;
}) {
  const meta = [visitedAtLabel, serviceName, staffName ? `担当: ${staffName}` : ""].filter(Boolean);

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <StickyNote className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900">前回の申し送り</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-amber-900">
            {note}
          </p>
          {meta.length > 0 && (
            <p className="mt-2 text-xs text-amber-700">{meta.join(" / ")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
