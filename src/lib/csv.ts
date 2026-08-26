/** CSV ユーティリティ（Excel での文字化けを防ぐため UTF-8 BOM を付与） */

const BOM = "﻿";

function escapeCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  // 先頭が数式記号の場合は CSV インジェクション対策でクォートを前置
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  if (/[",\n\r]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

/** 行データを CSV 文字列に変換（BOM付き・CRLF改行） */
export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) lines.push(row.map(escapeCell).join(","));
  return BOM + lines.join("\r\n") + "\r\n";
}

/** CSV ダウンロード用の Response を生成 */
export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * toCsv が付けた数式インジェクション対策のクォートを取り除く。
 * 付けたときと同じ条件（`\'` の直後が数式記号）のときだけ外すので、
 * 元から `\'` で始まる値を壊さない。
 */
function unescapeCell(cell: string): string {
  return /^'[=+\-@\t\r]/.test(cell) ? cell.slice(1) : cell;
}

/**
 * CSV テキストをパースして行配列を返す（ダブルクォート・埋め込み改行に対応）。
 * 先頭の BOM は除去し、書き出し時のインジェクション対策クォートも戻す。
 */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ",") { row.push(unescapeCell(cell)); cell = ""; continue; }
    if (ch === "\r") continue;
    if (ch === "\n") { row.push(unescapeCell(cell)); rows.push(row); row = []; cell = ""; continue; }
    cell += ch;
  }
  if (cell !== "" || row.length > 0) { row.push(unescapeCell(cell)); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
