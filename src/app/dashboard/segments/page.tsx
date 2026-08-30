import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { formatJstDateShort } from "@/lib/jst";
import { describeRules, parseRules, resolveTargets } from "@/lib/segments";
import { requireSession } from "@/lib/session";
import {
  SegmentsClient,
  type SegmentItem,
} from "./_components/segments-client";
import { SEGMENT_TARGET_PREVIEW_LIMIT } from "./_components/types";

export const metadata: Metadata = { title: "セグメント" };

export default async function SegmentsPage() {
  const session = await requireSession();

  const [segments, tags] = await Promise.all([
    prisma.segment.findMany({
      where: { storeId: session.storeId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.tag.findMany({
      where: { storeId: session.storeId },
      orderBy: { name: "asc" },
    }),
  ]);
  const tagNameById = new Map(tags.map((t) => [t.id, t.name]));
  const now = new Date();

  const items: SegmentItem[] = await Promise.all(
    segments.map(async (segment) => {
      const rules = parseRules(segment.rules);
      const tagNames = (rules.tagIds ?? [])
        .map((id) => tagNameById.get(id))
        .filter((name): name is string => name !== undefined);
      // 対象人数と「対象のお客様」一覧は同じ抽出結果から作る
      const targets = await resolveTargets(session.storeId, rules, now);
      return {
        id: segment.id,
        name: segment.name,
        rules,
        description: describeRules(rules, tagNames),
        targetCount: targets.length,
        targets: targets.slice(0, SEGMENT_TARGET_PREVIEW_LIMIT).map((customer) => ({
          id: customer.id,
          name: customer.name,
          kana: customer.kana,
          lastVisitLabel: customer.lastVisitAt ? formatJstDateShort(customer.lastVisitAt) : null,
          visitCount: customer.visitCount,
          linked: customer.lineUserId !== null,
        })),
        updatedAtLabel: formatJstDateShort(segment.updatedAt),
      };
    }),
  );

  return (
    <SegmentsClient
      segments={items}
      tags={tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))}
    />
  );
}
