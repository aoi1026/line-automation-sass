import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { formatJstDateShort } from "@/lib/jst";
import { countTargets, describeRules, parseRules } from "@/lib/segments";
import { requireSession } from "@/lib/session";
import {
  SegmentsClient,
  type SegmentItem,
} from "./_components/segments-client";

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
      return {
        id: segment.id,
        name: segment.name,
        rules,
        description: describeRules(rules, tagNames),
        targetCount: await countTargets(session.storeId, rules, now),
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
