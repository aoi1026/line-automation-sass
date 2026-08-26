import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, notFound, parseBody } from "@/lib/api";
import { notifyReservationEvent } from "@/lib/messaging";

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
  });
  if (!reservation) return notFound("ご予約が見つかりませんでした");

  const cancellable =
    (reservation.status === "PENDING" || reservation.status === "CONFIRMED") &&
    reservation.startAt > new Date();
  if (!cancellable) {
    return jsonError("この予約はキャンセルできません");
  }

  await prisma.reservation.update({
    where: { id: reservation.id },
    data: {
      status: "CANCELLED",
      cancelReason: data.cancelReason ?? "",
    },
  });

  await notifyReservationEvent(reservation.id, "CANCELLATION");

  return NextResponse.json({ ok: true });
}
