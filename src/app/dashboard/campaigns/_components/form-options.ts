import { prisma } from "@/lib/db";
import { parseRules } from "@/lib/segments";
import type { RuleBuilderTag } from "../../segments/rule-builder";
import type { CouponOption, SegmentOption } from "./campaign-form";

/** キャンペーンフォームで使う選択肢（セグメント・有効クーポン・タグ）を読み込む */
export async function loadCampaignFormOptions(storeId: string): Promise<{
  segments: SegmentOption[];
  coupons: CouponOption[];
  tags: RuleBuilderTag[];
}> {
  const [segments, coupons, tags] = await Promise.all([
    prisma.segment.findMany({ where: { storeId }, orderBy: { updatedAt: "desc" } }),
    prisma.coupon.findMany({ where: { storeId, active: true }, orderBy: { createdAt: "desc" } }),
    prisma.tag.findMany({ where: { storeId }, orderBy: { name: "asc" } }),
  ]);
  return {
    segments: segments.map((s) => ({ id: s.id, name: s.name, rules: parseRules(s.rules) })),
    coupons: coupons.map((c) => ({ id: c.id, title: c.title })),
    tags: tags.map((t) => ({ id: t.id, name: t.name, color: t.color })),
  };
}
