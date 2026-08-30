import type { Customer, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { addDays, jstParts } from "@/lib/jst";

/** セグメント抽出条件 */
export const segmentRulesSchema = z.object({
  lastVisitDaysMin: z.number().int().min(0).optional(), // 最終来店からN日以上経過
  lastVisitDaysMax: z.number().int().min(0).optional(), // 最終来店からN日以内
  visitCountMin: z.number().int().min(0).optional(),
  visitCountMax: z.number().int().min(0).optional(),
  totalSpentMin: z.number().int().min(0).optional(),
  tagIds: z.array(z.string()).optional(),
  birthdayMonth: z.number().int().min(1).max(12).optional(),
  gender: z.enum(["female", "male"]).optional(),
  hasLine: z.boolean().optional(),
});

export type SegmentRules = z.infer<typeof segmentRulesSchema>;

export function parseRules(raw: unknown): SegmentRules {
  const result = segmentRulesSchema.safeParse(raw ?? {});
  return result.success ? result.data : {};
}

/**
 * 抽出条件を Prisma の where に変換する（誕生月以外はすべてDB側で絞り込める）。
 * 誕生月はJST基準の月比較が必要なためここには含めず、取得後にJS側で絞り込む。
 */
export function buildTargetWhere(
  storeId: string,
  rules: SegmentRules,
  now = new Date()
): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = { storeId };
  const and: Prisma.CustomerWhereInput[] = [];

  if (rules.lastVisitDaysMin !== undefined) {
    // 最終来店から N 日以上経過 = lastVisitAt <= now - N日
    and.push({ lastVisitAt: { lte: addDays(now, -rules.lastVisitDaysMin) } });
  }
  if (rules.lastVisitDaysMax !== undefined) {
    and.push({ lastVisitAt: { gte: addDays(now, -rules.lastVisitDaysMax) } });
  }
  if (rules.visitCountMin !== undefined) and.push({ visitCount: { gte: rules.visitCountMin } });
  if (rules.visitCountMax !== undefined) and.push({ visitCount: { lte: rules.visitCountMax } });
  if (rules.totalSpentMin !== undefined) and.push({ totalSpent: { gte: rules.totalSpentMin } });
  if (rules.gender) and.push({ gender: rules.gender });
  if (rules.hasLine) and.push({ lineUserId: { not: null } });
  if (rules.tagIds && rules.tagIds.length > 0) {
    and.push({ tags: { some: { tagId: { in: rules.tagIds } } } });
  }
  if (and.length > 0) where.AND = and;

  return where;
}

/** 条件に合致する顧客を抽出 */
export async function resolveTargets(
  storeId: string,
  rules: SegmentRules,
  now = new Date()
): Promise<Customer[]> {
  const customers = await prisma.customer.findMany({
    where: buildTargetWhere(storeId, rules, now),
    orderBy: { lastVisitAt: "desc" },
  });

  // 誕生月はJST基準の月比較が必要なためJS側でフィルタ
  if (rules.birthdayMonth !== undefined) {
    return customers.filter(
      (c) => c.birthday && jstParts(c.birthday).month === rules.birthdayMonth
    );
  }
  return customers;
}

/**
 * 条件に合致する顧客の人数を数える。
 * 誕生月フィルタが無ければDBのcountで数えられる（顧客レコードをメモリに載せない）。
 * 誕生月フィルタがある場合だけは、JST基準の月比較をDBで表現できないため
 * 従来どおり顧客を取得してJS側で絞り込んだ件数を返す。
 */
export async function countTargets(
  storeId: string,
  rules: SegmentRules,
  now = new Date()
): Promise<number> {
  if (rules.birthdayMonth !== undefined) {
    const targets = await resolveTargets(storeId, rules, now);
    return targets.length;
  }
  return prisma.customer.count({ where: buildTargetWhere(storeId, rules, now) });
}

/** 条件を日本語の説明文に変換（UI表示用） */
export function describeRules(rules: SegmentRules, tagNames?: string[]): string {
  const parts: string[] = [];
  if (rules.lastVisitDaysMin !== undefined) parts.push(`最終来店から${rules.lastVisitDaysMin}日以上`);
  if (rules.lastVisitDaysMax !== undefined) parts.push(`最終来店から${rules.lastVisitDaysMax}日以内`);
  if (rules.visitCountMin !== undefined) parts.push(`来店回数${rules.visitCountMin}回以上`);
  if (rules.visitCountMax !== undefined) parts.push(`来店回数${rules.visitCountMax}回以下`);
  if (rules.totalSpentMin !== undefined) parts.push(`累計利用額${rules.totalSpentMin.toLocaleString("ja-JP")}円以上`);
  if (rules.tagIds && rules.tagIds.length > 0) {
    parts.push(tagNames && tagNames.length > 0 ? `タグ: ${tagNames.join("・")}` : `タグ${rules.tagIds.length}件`);
  }
  if (rules.birthdayMonth !== undefined) parts.push(`${rules.birthdayMonth}月生まれ`);
  if (rules.gender) parts.push(rules.gender === "female" ? "女性" : "男性");
  if (rules.hasLine) parts.push("LINE連携済み");
  return parts.length > 0 ? parts.join(" / ") : "全顧客";
}
