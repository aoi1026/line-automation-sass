"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  IMPORT_COLUMNS,
  MAX_IMPORT_ROWS,
  parseCustomerCsv,
  type ImportRowPayload,
} from "../import/_components/csv-mapping";

/** APIが返す取り込み結果 */
type SkippedRow = { rowNumber: number | null; name: string; reason: string };
type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  skippedRows: SkippedRow[];
};

/** 受け付ける列の一覧（「氏名（必須）・かな・…」の形式） */
const COLUMN_SUMMARY = IMPORT_COLUMNS.map((c) => (c.required ? `${c.label}（必須）` : c.label)).join(
  "・"
);

/** CSVから顧客をまとめて登録・更新するダイアログ */
export function CustomersImportDialog() {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setFile(null);
      setResult(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleImport() {
    if (!file || importing) return;

    let text: string;
    try {
      text = await file.text();
    } catch {
      toast.error("ファイルを読み込めませんでした。CSV形式のファイルをお選びください");
      return;
    }

    // 列の対応付けはヘッダー名で行うため、列の並び順は問わない
    const parsed = parseCustomerCsv(text, {});
    if (!parsed.ok) {
      toast.error(parsed.error);
      return;
    }

    const rows: ImportRowPayload[] = parsed.rows.map((row) => ({
      rowNumber: row.rowNumber,
      name: row.name,
      kana: row.kana,
      phone: row.phone,
      email: row.email,
      gender: row.gender,
      birthday: row.birthday,
      notes: row.notes,
    }));

    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<ImportResult> & {
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "取り込みに失敗しました");
        return;
      }

      const created = data.created ?? 0;
      const updated = data.updated ?? 0;
      const skipped = data.skipped ?? 0;
      const skippedRows = data.skippedRows ?? [];
      setResult({ created, updated, skipped, skippedRows });
      toast.success(
        skipped > 0
          ? `${created}件を新規登録し、${updated}件を更新しました（${skipped}件はスキップしました）`
          : `${created}件を新規登録し、${updated}件を更新しました`
      );
      router.refresh();
      // スキップされた行がない場合のみ閉じる（理由を確認していただくため）
      if (skipped === 0) handleOpenChange(false);
    } catch {
      toast.error("通信に失敗しました。もう一度お試しください");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Upload />
          CSVで取り込み
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>CSVで取り込み</DialogTitle>
          <DialogDescription>
            CSVファイルからお客様をまとめて登録します。電話番号が既存のお客様と一致する場合は、新規登録ではなく更新になります。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customers-import-file">CSVファイル</Label>
          <Input
            ref={inputRef}
            id="customers-import-file"
            type="file"
            accept=".csv,text/csv"
            className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:text-gray-700"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
          />
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs leading-relaxed text-gray-600">
          <p className="font-medium text-gray-700">見出し行に次の列をご用意ください</p>
          <p className="mt-1">{COLUMN_SUMMARY}</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-4">
            <li>氏名は必須です。空欄の行は取り込まずにスキップします。</li>
            <li>列の並び順は問いません。不要な列は省略していただけます。</li>
            <li>性別は「女性」「男性」「その他」、誕生日は1990-04-15の形式でご入力ください。</li>
            <li>1回に取り込めるのは{MAX_IMPORT_ROWS}行までです。文字コードはUTF-8に対応しています。</li>
          </ul>
        </div>

        {result && result.skippedRows.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-gray-900">
              取り込めなかった行（{result.skipped}件）
            </p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <ul className="space-y-1 text-xs text-red-700">
                {result.skippedRows.map((row, i) => (
                  <li key={`${row.rowNumber ?? "-"}-${i}`}>
                    {row.rowNumber ? `${row.rowNumber}行目` : "行番号不明"}
                    {row.name ? `（${row.name}様）` : ""}: {row.reason}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-gray-500">
              内容をご修正のうえ、あらためて取り込んでください。
            </p>
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={importing}>
              閉じる
            </Button>
          </DialogClose>
          <Button type="button" onClick={() => void handleImport()} disabled={!file || importing}>
            <Upload />
            {importing ? "取り込み中..." : "取り込む"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
