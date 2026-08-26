import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getApiSession, parseBody, unauthorized } from "@/lib/api";

const kindSchema = z.enum([
  "BOOKING_CONFIRMATION",
  "REMINDER",
  "CANCELLATION",
  "RESCHEDULE",
  "THANKS",
  "REBOOKING",
  "BIRTHDAY",
]);

/** テンプレート一覧 */
export async function GET() {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const templates = await prisma.messageTemplate.findMany({
    where: { storeId: session.storeId },
    orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(templates);
}

const createSchema = z.object({
  kind: kindSchema,
  name: z
    .string()
    .trim()
    .min(1, "テンプレート名を入力してください")
    .max(100, "テンプレート名は100文字以内で入力してください"),
  content: z
    .string()
    .trim()
    .min(1, "本文を入力してください")
    .max(5000, "本文は5000文字以内で入力してください"),
  enabled: z.boolean().optional(),
});

/** テンプレート作成 */
export async function POST(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { data, error } = await parseBody(req, createSchema);
  if (error) return error;

  const template = await prisma.messageTemplate.create({
    data: {
      storeId: session.storeId,
      kind: data.kind,
      name: data.name,
      content: data.content,
      enabled: data.enabled ?? true,
    },
  });
  return NextResponse.json(template);
}
