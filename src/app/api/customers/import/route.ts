import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, parseBody, unauthorized } from "@/lib/api";
import { fromJst, jstYmd } from "@/lib/jst";

/** 1回のインポートで取り込める最大行数 */
const MAX_IMPORT_ROWS = 1000;

const bodySchema = z.object({
  rows: z.array(z.unknown()),
});

/** クライアントでパース済みの1行。サーバー側でも同じ内容を再検証する。 */
const rowSchema = z.object({
  /** 元CSVの行番号（結果表示用。1始まり・ヘッダー行を含む） */
  rowNumber: z.number().int().positive().optional(),
  name: z
    .string()
    .trim()
    .min(1, "氏名が空欄です")
    .max(100, "氏名が長すぎます（100文字以内）"),
  kana: z.string().trim().max(100, "かなが長すぎます（100文字以内）").optional().default(""),
  phone: z.string().trim().max(30, "電話番号が長すぎます（30文字以内）").optional().default(""),
  email: z
    .string()
    .trim()
    .max(200, "メールアドレスが長すぎます（200文字以内）")
    .optional()
    .default(""),
  gender: z.string().trim().max(20).optional().default(""),
  birthday: z.string().trim().max(20).optional().default(""),
  notes: z.string().trim().max(2000, "メモが長すぎます（2000文字以内）").optional().default(""),
});

type SkippedRow = { rowNumber: number | null; name: string; reason: string };

/** 全角数字を半角にしたうえで数字のみを抜き出す（ハイフン等の表記ゆれを吸収） */
function normalizePhone(phone: string): string {
  return phone
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\D/g, "");
}

/** "female" | "male" | "other" 以外（日本語ラベルも許容）は空文字を返す */
function normalizeGender(value: string): string {
  const v = value.trim();
  if (v === "female" || v === "male" || v === "other") return v;
  if (v === "女性") return "female";
  if (v === "男性") return "male";
  if (v === "その他") return "other";
  return "";
}

/** "YYYY-MM-DD" / "YYYY/MM/DD" を受け付ける。不正な形式は null（行自体は取り込む）。 */
function parseBirthday(value: string): Date | null {
  const v = value.trim().replace(/\//g, "-");
  if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(v)) return null;
  const [y, m, d] = v.split("-");
  const ymd = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const date = fromJst(ymd);
  if (Number.isNaN(date.getTime())) return null;
  // 「2026-02-31」のような存在しない日付を弾く
  if (jstYmd(date) !== ymd) return null;
  return date;
}

/** CSVから取り込んだ顧客を登録・更新する（電話番号が一致する顧客は更新） */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, bodySchema);
  if (error) return error;

  if (data.rows.length === 0) return jsonError("取り込む行がありません");
  if (data.rows.length > MAX_IMPORT_ROWS) {
    return jsonError(`1回に取り込めるのは${MAX_IMPORT_ROWS}行までです`);
  }

  // 既存顧客との突き合わせ用に、この店舗の顧客を1度だけ読み込む。
  //
  // 突き合わせは「電話番号 + 氏名」で行う。電話番号だけで判定すると、
  // ご家族で同じ番号を共有しているお客様（自宅の固定電話など）を
  // 別人と識別できず、既存のお客様の情報を上書きしてしまうため。
  const existing = await prisma.customer.findMany({
    where: { storeId: session.storeId, NOT: { phone: "" } },
    select: { id: true, phone: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  const matchKey = (phone: string, name: string) =>
    `${normalizePhone(phone)}\u0000${name.trim()}`;
  const byPhoneAndName = new Map<string, string>();
  for (const c of existing) {
    const key = normalizePhone(c.phone) ? matchKey(c.phone, c.name) : "";
    if (key && !byPhoneAndName.has(key)) byPhoneAndName.set(key, c.id);
  }

  let created = 0;
  let updated = 0;
  const skippedRows: SkippedRow[] = [];

  for (const [index, raw] of data.rows.entries()) {
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      const source = (raw ?? {}) as Record<string, unknown>;
      skippedRows.push({
        rowNumber: typeof source.rowNumber === "number" ? source.rowNumber : index + 2,
        name: typeof source.name === "string" ? source.name.trim() : "",
        reason: parsed.error.issues[0]?.message ?? "入力内容が不正です",
      });
      continue;
    }

    const row = parsed.data;
    const rowNumber = row.rowNumber ?? index + 2;
    const phoneKey = normalizePhone(row.phone);
    const birthday = row.birthday ? parseBirthday(row.birthday) : null;
    const gender = normalizeGender(row.gender);
    const existingId = phoneKey ? byPhoneAndName.get(matchKey(row.phone, row.name)) : undefined;

    if (existingId) {
      // 既存顧客は「空欄でない項目のみ」上書きする
      const patch: Prisma.CustomerUpdateInput = { name: row.name };
      if (row.kana) patch.kana = row.kana;
      if (row.phone) patch.phone = row.phone;
      if (row.email) patch.email = row.email;
      if (gender) patch.gender = gender;
      if (birthday) patch.birthday = birthday;
      if (row.notes) patch.notes = row.notes;

      const result = await prisma.customer.updateMany({
        where: { id: existingId, storeId: session.storeId },
        data: patch,
      });
      if (result.count === 0) {
        skippedRows.push({
          rowNumber,
          name: row.name,
          reason: "更新対象のお客様が見つかりませんでした",
        });
        continue;
      }
      updated += 1;
      continue;
    }

    const customer = await prisma.customer.create({
      data: {
        storeId: session.storeId,
        name: row.name,
        kana: row.kana,
        phone: row.phone,
        email: row.email,
        gender,
        birthday,
        notes: row.notes,
      },
      select: { id: true },
    });
    created += 1;
    // 同一ファイル内に同じ電話番号が複数ある場合は、2件目以降を更新として扱う
    if (phoneKey) byPhoneAndName.set(matchKey(row.phone, row.name), customer.id);
  }

  return NextResponse.json({
    created,
    updated,
    skipped: skippedRows.length,
    skippedRows,
  });
}
