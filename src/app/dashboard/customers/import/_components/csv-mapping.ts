import { parseCsv, toCsv } from "@/lib/csv";

/** 1回のインポートで取り込める最大行数（APIと合わせる） */
export const MAX_IMPORT_ROWS = 1000;

/** プレビューで表示する行数 */
export const PREVIEW_ROW_LIMIT = 20;

export type ImportField = "name" | "kana" | "phone" | "email" | "gender" | "birthday" | "notes";

/** 受け付ける列の定義（ヘッダー名で対応付けるため、列の順序は問わない） */
export const IMPORT_COLUMNS: {
  field: ImportField;
  label: string;
  required: boolean;
  /** 表記ゆれを吸収するための別名 */
  aliases: string[];
  example: string;
  hint: string;
}[] = [
  {
    field: "name",
    label: "氏名",
    required: true,
    aliases: ["名前", "お名前", "顧客名", "お客様名"],
    example: "山田 花子",
    hint: "必須。空欄の行は取り込みません。",
  },
  {
    field: "kana",
    label: "かな",
    required: false,
    aliases: ["カナ", "ふりがな", "フリガナ", "氏名かな", "氏名カナ"],
    example: "やまだ はなこ",
    hint: "ひらがな・カタカナのどちらでも登録できます。",
  },
  {
    field: "phone",
    label: "電話番号",
    required: false,
    aliases: ["電話", "TEL", "tel", "携帯番号", "携帯電話"],
    example: "090-1234-5678",
    hint: "既存のお客様と一致した場合は、新規登録ではなく更新になります。",
  },
  {
    field: "email",
    label: "メールアドレス",
    required: false,
    aliases: ["メール", "mail", "email", "Eメール"],
    example: "hanako@example.com",
    hint: "",
  },
  {
    field: "gender",
    label: "性別",
    required: false,
    aliases: [],
    example: "女性",
    hint: "「女性」「男性」「その他」のいずれか。それ以外は未設定になります。",
  },
  {
    field: "birthday",
    label: "誕生日",
    required: false,
    aliases: ["生年月日"],
    example: "1990-04-15",
    hint: "1990-04-15 または 1990/04/15 の形式。",
  },
  {
    field: "notes",
    label: "メモ",
    required: false,
    aliases: ["備考", "特記事項"],
    example: "カラーはアッシュ系がお好みです",
    hint: "",
  },
];

/** サーバーへ送る1行分のデータ */
export type ImportRowPayload = {
  rowNumber: number;
  name: string;
  kana: string;
  phone: string;
  email: string;
  gender: string;
  birthday: string;
  notes: string;
};

export type RowStatus = "new" | "update" | "error";

/** プレビュー表示用の1行 */
export type PreviewRow = ImportRowPayload & {
  status: RowStatus;
  /** エラー行の理由 */
  errorReason: string;
  /** 取り込みは行うが注意が必要な点 */
  warnings: string[];
  /** 更新対象となる既存顧客の氏名 */
  matchedName: string;
};

export type ParseResult =
  | { ok: false; error: string }
  | { ok: true; rows: PreviewRow[]; newCount: number; updateCount: number; errorCount: number };

/** ヘッダー名の表記ゆれ（前後の空白・全角空白・大文字小文字）を吸収する */
function normalizeHeader(value: string): string {
  return value.replace(/[\s　]/g, "").toLowerCase();
}

/** 全角数字を半角にしたうえで数字のみを抜き出す（APIと同じ突き合わせ規則） */
export function normalizePhone(phone: string): string {
  return phone
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\D/g, "");
}

/** 「女性 / 男性 / その他」を内部値に変換。それ以外は空文字。 */
export function normalizeGender(value: string): string {
  const v = value.trim();
  if (v === "女性" || v === "female") return "female";
  if (v === "男性" || v === "male") return "male";
  if (v === "その他" || v === "other") return "other";
  return "";
}

/** 誕生日を "YYYY-MM-DD" に正規化。不正な形式は null。 */
export function normalizeBirthday(value: string): string | null {
  const v = value.trim().replace(/\//g, "-");
  if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(v)) return null;
  const [y, m, d] = v.split("-");
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // 存在しない日付（2月30日など）を弾く
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * CSVテキストを解析し、プレビュー用の行データに変換する。
 * @param existingByPhone 既存顧客の「正規化した電話番号 → 氏名」
 */
export function parseCustomerCsv(text: string, existingByPhone: Record<string, string>): ParseResult {
  const table = parseCsv(text);
  if (table.length === 0) return { ok: false, error: "ファイルに読み取れる行がありませんでした。" };

  const header = table[0].map(normalizeHeader);
  const indexOf: Partial<Record<ImportField, number>> = {};
  for (const column of IMPORT_COLUMNS) {
    const candidates = [column.label, ...column.aliases].map(normalizeHeader);
    const index = header.findIndex((h) => candidates.includes(h));
    if (index >= 0) indexOf[column.field] = index;
  }

  if (indexOf.name === undefined) {
    return {
      ok: false,
      error: "「氏名」列が見つかりませんでした。テンプレートCSVの見出し行をご利用ください。",
    };
  }

  const body = table.slice(1);
  if (body.length === 0) {
    return { ok: false, error: "見出し行のみで、取り込むデータがありませんでした。" };
  }

  const cell = (row: string[], field: ImportField): string => {
    const index = indexOf[field];
    if (index === undefined) return "";
    return (row[index] ?? "").trim();
  };

  // 既存顧客 + ファイル内で既に登場した電話番号
  const seen = new Map<string, string>(Object.entries(existingByPhone));

  const rows: PreviewRow[] = [];
  let newCount = 0;
  let updateCount = 0;
  let errorCount = 0;

  body.forEach((raw, i) => {
    const rowNumber = i + 2; // 見出し行を1行目として数える
    const name = cell(raw, "name");
    const phone = cell(raw, "phone");
    const rawGender = cell(raw, "gender");
    const rawBirthday = cell(raw, "birthday");
    const warnings: string[] = [];

    const gender = normalizeGender(rawGender);
    if (rawGender && !gender) warnings.push("性別を判別できないため未設定にします");

    const birthday = normalizeBirthday(rawBirthday);
    if (rawBirthday && !birthday) warnings.push("誕生日の形式が正しくないため取り込みません");

    const base: ImportRowPayload = {
      rowNumber,
      name,
      kana: cell(raw, "kana"),
      phone,
      email: cell(raw, "email"),
      gender,
      birthday: birthday ?? "",
      notes: cell(raw, "notes"),
    };

    if (!name) {
      errorCount += 1;
      rows.push({
        ...base,
        status: "error",
        errorReason: "氏名が空欄です",
        warnings,
        matchedName: "",
      });
      return;
    }

    const phoneKey = normalizePhone(phone);
    const matchedName = phoneKey ? (seen.get(phoneKey) ?? "") : "";
    if (phoneKey && seen.has(phoneKey)) {
      updateCount += 1;
      rows.push({ ...base, status: "update", errorReason: "", warnings, matchedName });
      return;
    }

    if (phoneKey) seen.set(phoneKey, name);
    newCount += 1;
    rows.push({ ...base, status: "new", errorReason: "", warnings, matchedName: "" });
  });

  return { ok: true, rows, newCount, updateCount, errorCount };
}

/** 記入例入りのテンプレートCSV（UTF-8 BOM付き） */
export function buildTemplateCsv(): string {
  return toCsv(
    IMPORT_COLUMNS.map((c) => c.label),
    [IMPORT_COLUMNS.map((c) => c.example)]
  );
}
