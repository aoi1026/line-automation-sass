"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RotateCcw,
  UploadCloud,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { GENDER_LABELS } from "@/lib/constants";
import { cn, formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildTemplateCsv,
  IMPORT_COLUMNS,
  MAX_IMPORT_ROWS,
  PREVIEW_ROW_LIMIT,
  parseCustomerCsv,
  type ImportRowPayload,
  type PreviewRow,
} from "./csv-mapping";

type Step = "select" | "preview" | "done";

type SkippedRow = { rowNumber: number | null; name: string; reason: string };

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  skippedRows: SkippedRow[];
};

const STEPS: { key: Step; label: string }[] = [
  { key: "select", label: "ファイルを選択" },
  { key: "preview", label: "内容を確認" },
  { key: "done", label: "取り込み結果" },
];

/** ファイルをArrayBufferとして読み込む */
function readFileBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ファイルを読み込めませんでした"));
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error("ファイルを読み込めませんでした"));
    };
    reader.readAsArrayBuffer(file);
  });
}

/** UTF-8（BOMの有無を問わず）で読み、解釈できない場合はShift_JISとして読み直す */
function decodeCsv(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("shift_jis").decode(bytes);
  }
}

function StepIndicator({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={step.key} className="flex items-center gap-2" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                active && "bg-brand text-white",
                done && "bg-brand/10 text-brand-dark",
                !active && !done && "bg-gray-100 text-gray-400"
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                "font-medium",
                active ? "text-gray-900" : done ? "text-gray-600" : "text-gray-400"
              )}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && <span className="px-1 text-gray-300">›</span>}
          </li>
        );
      })}
    </ol>
  );
}

function StatusBadge({ row }: { row: PreviewRow }) {
  if (row.status === "error") return <Badge variant="destructive">エラー</Badge>;
  if (row.status === "update") return <Badge className="bg-amber-100 text-amber-800">更新</Badge>;
  if (row.warnings.length > 0) return <Badge className="bg-amber-100 text-amber-800">警告</Badge>;
  return <Badge variant="secondary">新規</Badge>;
}

/** CSVから顧客を取り込む3ステップのウィザード */
export function ImportWizard({ existingByPhone }: { existingByPhone: Record<string, string> }) {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [step, setStep] = React.useState<Step>("select");
  const [fileName, setFileName] = React.useState("");
  const [parseError, setParseError] = React.useState("");
  const [rows, setRows] = React.useState<PreviewRow[]>([]);
  const [counts, setCounts] = React.useState({ newCount: 0, updateCount: 0, errorCount: 0 });
  const [importing, setImporting] = React.useState(false);
  const [result, setResult] = React.useState<ImportResult | null>(null);

  const tooManyRows = rows.length > MAX_IMPORT_ROWS;
  const importable = counts.newCount + counts.updateCount;

  function downloadTemplate() {
    const blob = new Blob([buildTemplateCsv()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "顧客インポート用テンプレート.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setParseError("");
    setFileName(file.name);
    try {
      const text = decodeCsv(await readFileBuffer(file));
      const parsed = parseCustomerCsv(text, existingByPhone);
      if (!parsed.ok) {
        setRows([]);
        setParseError(parsed.error);
        toast.error(parsed.error);
        return;
      }
      setRows(parsed.rows);
      setCounts({
        newCount: parsed.newCount,
        updateCount: parsed.updateCount,
        errorCount: parsed.errorCount,
      });
      setStep("preview");
    } catch {
      setRows([]);
      setParseError("ファイルを読み込めませんでした。CSV形式のファイルをお選びください。");
      toast.error("ファイルを読み込めませんでした");
    }
  }

  function backToSelect() {
    setStep("select");
    setRows([]);
    setParseError("");
    setFileName("");
  }

  function restart() {
    setResult(null);
    backToSelect();
  }

  async function runImport() {
    if (importing || rows.length === 0 || tooManyRows) return;
    setImporting(true);
    try {
      const payload: ImportRowPayload[] = rows.map((row) => ({
        rowNumber: row.rowNumber,
        name: row.name,
        kana: row.kana,
        phone: row.phone,
        email: row.email,
        gender: row.gender,
        birthday: row.birthday,
        notes: row.notes,
      }));
      const res = await fetch("/api/customers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<ImportResult> & {
        error?: string;
      };
      if (!res.ok || typeof data.created !== "number" || typeof data.updated !== "number") {
        toast.error(data.error ?? "取り込みに失敗しました");
        return;
      }
      setResult({
        created: data.created,
        updated: data.updated,
        skipped: data.skipped ?? 0,
        skippedRows: data.skippedRows ?? [],
      });
      setStep("done");
      toast.success(`${data.created}件を新規登録し、${data.updated}件を更新しました`);
      router.refresh();
    } catch {
      toast.error("取り込みに失敗しました");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <StepIndicator current={step} />

      {step === "select" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>CSVファイルを選択</CardTitle>
              <CardDescription>
                お客様の情報をまとめて登録・更新します。まずはテンプレートをダウンロードし、内容を入力したファイルをお選びください。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 px-6 py-10 text-center">
                <UploadCloud aria-hidden="true" className="mx-auto h-10 w-10 text-gray-300" />
                <p className="mt-3 font-medium text-gray-700">CSVファイルをアップロード</p>
                <p className="mt-1 text-sm text-gray-500">
                  1回に取り込めるのは{formatNumber(MAX_IMPORT_ROWS)}行までです。文字コードはUTF-8とShift_JISに対応しています。
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row">
                  <Button type="button" onClick={() => fileInputRef.current?.click()}>
                    <FileSpreadsheet aria-hidden="true" />
                    ファイルを選ぶ
                  </Button>
                  <Button type="button" variant="outline" onClick={downloadTemplate}>
                    <Download aria-hidden="true" />
                    テンプレートCSVをダウンロード
                  </Button>
                </div>
                {fileName && !parseError && (
                  <p className="mt-3 text-xs text-gray-500">選択中のファイル: {fileName}</p>
                )}
              </div>

              {parseError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  <XCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>受け付ける列</CardTitle>
              <CardDescription>
                見出し行の名前で列を対応付けるため、列の並び順は自由です。不要な列は省略できます。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>列名</TableHead>
                    <TableHead>必須</TableHead>
                    <TableHead>記入例</TableHead>
                    <TableHead>備考</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {IMPORT_COLUMNS.map((column) => (
                    <TableRow key={column.field}>
                      <TableCell className="font-medium text-gray-900">{column.label}</TableCell>
                      <TableCell>
                        {column.required ? (
                          <Badge variant="destructive">必須</Badge>
                        ) : (
                          <span className="text-xs text-gray-400">任意</span>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-600">{column.example}</TableCell>
                      <TableCell className="text-xs text-gray-500">{column.hint || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="新規登録"
              value={`${formatNumber(counts.newCount)}件`}
              icon={<UserPlus aria-hidden="true" />}
              sub="まだ登録のないお客様"
            />
            <StatCard
              label="更新"
              value={`${formatNumber(counts.updateCount)}件`}
              icon={<Users aria-hidden="true" />}
              sub="電話番号が一致した既存のお客様"
            />
            <StatCard
              label="エラー"
              value={`${formatNumber(counts.errorCount)}件`}
              icon={<AlertTriangle aria-hidden="true" />}
              sub="取り込まずにスキップします"
            />
          </div>

          {tooManyRows && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              <XCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {formatNumber(rows.length)}行が含まれています。1回に取り込めるのは
                {formatNumber(MAX_IMPORT_ROWS)}行までです。ファイルを分割してからお試しください。
              </span>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>取り込み内容の確認</CardTitle>
              <CardDescription>
                {fileName ? `${fileName} を読み込みました。` : ""}全{formatNumber(rows.length)}行のうち、先頭
                {formatNumber(Math.min(rows.length, PREVIEW_ROW_LIMIT))}行を表示しています。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>行</TableHead>
                    <TableHead>判定</TableHead>
                    <TableHead>氏名</TableHead>
                    <TableHead>かな</TableHead>
                    <TableHead>電話番号</TableHead>
                    <TableHead>メールアドレス</TableHead>
                    <TableHead>性別</TableHead>
                    <TableHead>誕生日</TableHead>
                    <TableHead>備考</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, PREVIEW_ROW_LIMIT).map((row) => (
                    <TableRow
                      key={row.rowNumber}
                      className={cn(row.status === "error" && "bg-red-50/60")}
                    >
                      <TableCell className="text-xs text-gray-400">{row.rowNumber}</TableCell>
                      <TableCell>
                        <StatusBadge row={row} />
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{row.name || "—"}</TableCell>
                      <TableCell className="text-gray-600">{row.kana || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-gray-600">
                        {row.phone || "—"}
                      </TableCell>
                      <TableCell className="text-gray-600">{row.email || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-gray-600">
                        {row.gender ? GENDER_LABELS[row.gender] : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-gray-600">
                        {row.birthday || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {row.status === "error" ? (
                          <span className="text-red-600">{row.errorReason}</span>
                        ) : (
                          <span className="space-y-0.5">
                            {row.status === "update" && (
                              <span className="block">
                                {row.matchedName
                                  ? `既存の「${row.matchedName}」様を更新します`
                                  : "既存のお客様を更新します"}
                              </span>
                            )}
                            {row.warnings.map((warning) => (
                              <span key={warning} className="block text-amber-700">
                                {warning}
                              </span>
                            ))}
                            {row.status === "new" && row.warnings.length === 0 && "—"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <p className="mt-4 text-xs text-gray-500">
                更新の場合、CSVで空欄になっている項目は変更しません。電話番号はハイフンの有無に関わらず照合します。
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={backToSelect} disabled={importing}>
              <ArrowLeft aria-hidden="true" />
              ファイルを選び直す
            </Button>
            <Button
              type="button"
              onClick={runImport}
              disabled={importing || tooManyRows || importable === 0}
            >
              <UploadCloud aria-hidden="true" />
              {importing ? "取り込み中…" : `${formatNumber(importable)}件を取り込む`}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="新規登録" value={`${formatNumber(result.created)}件`} icon={<UserPlus aria-hidden="true" />} />
            <StatCard label="更新" value={`${formatNumber(result.updated)}件`} icon={<Users aria-hidden="true" />} />
            <StatCard label="スキップ" value={`${formatNumber(result.skipped)}件`} icon={<AlertTriangle aria-hidden="true" />} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>取り込みが完了しました</CardTitle>
              <CardDescription>
                {result.skipped > 0
                  ? "取り込めなかった行は以下のとおりです。内容を修正のうえ、あらためて取り込んでください。"
                  : "すべての行を取り込みました。顧客一覧からご確認いただけます。"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.skipped > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>行</TableHead>
                      <TableHead>氏名</TableHead>
                      <TableHead>理由</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.skippedRows.map((row, i) => (
                      <TableRow key={`${row.rowNumber ?? "-"}-${i}`}>
                        <TableCell className="text-xs text-gray-400">
                          {row.rowNumber ?? "—"}
                        </TableCell>
                        <TableCell className="text-gray-900">{row.name || "—"}</TableCell>
                        <TableCell className="text-sm text-red-600">{row.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span>スキップされた行はありませんでした。</span>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={restart}>
                  <RotateCcw aria-hidden="true" />
                  続けてインポート
                </Button>
                <Link href="/dashboard/customers" className={buttonVariants()}>
                  顧客一覧に戻る
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
