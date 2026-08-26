import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, notFound, parseBody } from "@/lib/api";
import { addMinutes, formatJstDateTime, fromJst } from "@/lib/jst";
import { notify } from "@/lib/notifications";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { computeDaySlots } from "./shared";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  serviceId: z.string().min(1, "メニューを選択してください"),
  staffId: z.string().min(1).nullable().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "日付の形式が正しくありません")
    .refine((d) => !Number.isNaN(fromJst(d).getTime()), "日付が正しくありません"),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "時刻の形式が正しくありません"),
  name: z.string().trim().min(1, "お名前を入力してください").max(100),
  kana: z.string().trim().max(100).optional(),
  phone: z
    .string()
    .trim()
    .min(8, "電話番号を正しく入力してください")
    .max(20, "電話番号を正しく入力してください")
    .regex(/^[0-9+\-() ]+$/, "電話番号を正しく入力してください"),
  email: z
    .string()
    .trim()
    .email("メールアドレスの形式が正しくありません")
    .or(z.literal(""))
    .optional(),
  note: z.string().max(1000, "ご要望は1000文字以内で入力してください").optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = getClientIp(req);
  const rl = rateLimit(`booking:${ip}`, 20, 60 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "試行回数が多すぎます。しばらく時間をおいてお試しください。" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const { slug } = await params;
  const { data, error } = await parseBody(req, bodySchema);
  if (error) return error;

  const store = await prisma.store.findUnique({ where: { slug } });
  if (!store) return notFound("店舗が見つかりませんでした");

  const service = await prisma.service.findFirst({
    where: { id: data.serviceId, storeId: store.id, active: true },
  });
  if (!service) return notFound("メニューが見つかりませんでした");

  const staffId = data.staffId ?? null;
  if (staffId) {
    const staff = await prisma.staffMember.findFirst({
      where: { id: staffId, storeId: store.id, active: true },
    });
    if (!staff) return notFound("スタッフが見つかりませんでした");
  }

  // サーバー側で空き状況を再検証（クライアント表示後に埋まっている可能性があるため）
  const slots = await computeDaySlots({
    store,
    service,
    staffId,
    dateYmd: data.date,
  });
  if (!slots.includes(data.time)) {
    return jsonError(
      "申し訳ありません。その時間は埋まってしまいました。別の時間をお選びください",
      409
    );
  }

  const kana = data.kana?.trim() ?? "";
  const email = data.email?.trim() ?? "";
  const note = data.note?.trim() ?? "";

  // 顧客の特定: 同一店舗・同一電話番号・同一氏名なら既存顧客として扱う
  let customer = await prisma.customer.findFirst({
    where: { storeId: store.id, phone: data.phone, name: data.name },
  });
  if (customer) {
    const updates: { kana?: string; email?: string } = {};
    if (kana && kana !== customer.kana) updates.kana = kana;
    if (email && email !== customer.email) updates.email = email;
    if (Object.keys(updates).length > 0) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: updates,
      });
    }
  } else {
    customer = await prisma.customer.create({
      data: {
        storeId: store.id,
        name: data.name,
        kana,
        phone: data.phone,
        email,
      },
    });
  }

  const startAt = fromJst(data.date, data.time);
  const endAt = addMinutes(startAt, service.durationMin);

  const reservation = await prisma.reservation.create({
    data: {
      storeId: store.id,
      customerId: customer.id,
      serviceId: service.id,
      staffId,
      startAt,
      endAt,
      status: "PENDING",
      source: "WEB",
      price: service.price,
      note,
    },
  });

  // 店舗スタッフ向けの通知（Web予約は未確定のため、確定操作を促す）。
  // notify() は内部で例外を握りつぶすため、予約の登録を妨げることはない
  await notify({
    storeId: store.id,
    type: "NEW_WEB_RESERVATION",
    title: `${customer.name}様からWeb予約`,
    body: `${formatJstDateTime(startAt)}に「${service.name}」のご予約を受け付けました。内容をご確認ください。`,
    link: `/dashboard/reservations/${reservation.id}`,
  });

  // Web予約は未確定（PENDING）で登録されるため、ここでは確認メッセージを送らない。
  // 店舗が「確定する」操作を行った時点で BOOKING_CONFIRMATION が送信される
  // （送信元: PATCH /api/reservations/[id] の confirm）。二重送信の防止。

  return NextResponse.json({ publicToken: reservation.publicToken });
}
