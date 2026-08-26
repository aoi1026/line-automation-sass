import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, notFound, parseBody } from "@/lib/api";
import { formatJstDateTime } from "@/lib/jst";
import { notifyReservationEvent } from "@/lib/messaging";
import { notify } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  cancelReason: z
    .string()
    .trim()
    .max(500, "キャンセル理由は500文字以内で入力してください")
    .optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { data, error } = await parseBody(req, bodySchema);
  if (error) return error;

  const reservation = await prisma.reservation.findUnique({
    where: { publicToken: token },
    include: {
      customer: { select: { name: true } },
      service: { select: { name: true } },
    },
  });
  if (!reservation) return notFound("ご予約が見つかりませんでした");

  const cancellable =
    (reservation.status === "PENDING" || reservation.status === "CONFIRMED") &&
    reservation.startAt > new Date();
  if (!cancellable) {
    return jsonError("この予約はキャンセルできません");
  }

  // 二重送信防止: まだ有効な予約だった場合のみキャンセルを確定させる
  const cancelReason = data.cancelReason ?? "";
  const { count } = await prisma.reservation.updateMany({
    where: {
      id: reservation.id,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    data: {
      status: "CANCELLED",
      cancelReason,
    },
  });
  if (count === 0) {
    return jsonError("この予約はキャンセルできません");
  }

  await notifyReservationEvent(reservation.id, "CANCELLATION");

  // 店舗スタッフ向けの通知（お客様都合のキャンセルは枠の再調整が必要なため）。
  // notify() は内部で例外を握りつぶすため、キャンセル処理を妨げることはない
  const menuLabel = reservation.service ? `「${reservation.service.name}」の` : "";
  await notify({
    storeId: reservation.storeId,
    type: "RESERVATION_CANCELLED",
    title: `${reservation.customer.name}様がキャンセル`,
    body:
      `${formatJstDateTime(reservation.startAt)}の${menuLabel}ご予約がキャンセルされました。` +
      (cancelReason ? `理由: ${cancelReason}` : ""),
    link: `/dashboard/reservations/${reservation.id}`,
  });

  return NextResponse.json({ ok: true });
}
