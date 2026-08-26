import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getApiSession, unauthorized } from "@/lib/api";
import { csvResponse, toCsv } from "@/lib/csv";
import { GENDER_LABELS } from "@/lib/constants";
import { jstYmd } from "@/lib/jst";

const HEADERS = [
  "氏名",
  "かな",
  "電話番号",
  "メールアドレス",
  "性別",
  "誕生日",
  "タグ",
  "初回来店日",
  "最終来店日",
  "来店回数",
  "累計利用額",
  "LINE連携",
  "メモ",
];

/** JSTの "YYYY-MM-DD"（未設定は空欄） */
function ymd(date: Date | null): string {
  return date ? jstYmd(date) : "";
}

/**
 * 顧客一覧をCSVでダウンロード。
 * 一覧画面の絞り込み（?q= 名前/かな/電話、?tagId= または ?tag= タグ）をそのまま引き継ぐ。
 */
export async function GET(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const tagId = (url.searchParams.get("tagId") ?? url.searchParams.get("tag") ?? "").trim();

  const where: Prisma.CustomerWhereInput = {
    storeId: session.storeId,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { kana: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
          ],
        }
      : {}),
    ...(tagId ? { tags: { some: { tagId } } } : {}),
  };

  const customers = await prisma.customer.findMany({
    where,
    include: { tags: { include: { tag: true } } },
    orderBy: [{ lastVisitAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  });

  const rows = customers.map((c) => [
    c.name,
    c.kana,
    c.phone,
    c.email,
    c.gender ? (GENDER_LABELS[c.gender] ?? "") : "",
    ymd(c.birthday),
    c.tags.map(({ tag }) => tag.name).join("・"),
    ymd(c.firstVisitAt),
    ymd(c.lastVisitAt),
    c.visitCount,
    c.totalSpent,
    c.lineUserId ? "連携済み" : "未連携",
    c.notes,
  ]);

  const filename = `顧客一覧_${jstYmd(new Date()).replace(/-/g, "")}.csv`;
  return csvResponse(filename, toCsv(HEADERS, rows));
}
