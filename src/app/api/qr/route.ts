import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { getApiSession, jsonError, notFound, unauthorized } from "@/lib/api";
import { getAppUrl } from "@/lib/utils";

export const runtime = "nodejs";

/** Web予約ページのQRコード画像（PNG）を返す */
export async function GET(req: Request) {
  const session = await getApiSession();
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "booking";
  if (type !== "booking") return jsonError("QRコードの種類が不正です");

  const store = await prisma.store.findFirst({
    where: { id: session.storeId },
    select: { slug: true },
  });
  if (!store) return notFound("店舗が見つかりませんでした");

  const url = `${getAppUrl()}/r/${store.slug}`;
  const png = await QRCode.toBuffer(url, {
    width: 600,
    margin: 2,
    color: { dark: "#111827", light: "#FFFFFF" },
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Length": String(png.byteLength),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
