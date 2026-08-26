import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarPlus,
  CalendarX2,
  Clock,
  Heart,
  Info,
  Phone,
} from "lucide-react";
import { prisma } from "@/lib/db";
import {
  RESERVATION_STATUS_COLORS,
  RESERVATION_STATUS_LABELS,
} from "@/lib/constants";
import { formatJstDateTime } from "@/lib/jst";
import { cn, formatYen } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CancelSection } from "./cancel-section";

export const dynamic = "force-dynamic";

/**
 * お客様ごとの個別URLのため、検索エンジンには一切登録させない。
 * （robots.ts でもクロールを禁止しているが、meta でも二重に指定する）
 */
export const metadata: Metadata = {
  title: "ご予約の確認",
  description: "ご予約の内容確認とキャンセルのお手続きができます。",
  robots: { index: false, follow: false, nocache: true },
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-sm text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

export default async function PublicReservationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { publicToken: token },
    include: { store: true, service: true, staff: true, customer: true },
  });

  if (!reservation) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <CalendarX2 aria-hidden="true" className="mx-auto h-12 w-12 text-gray-300" />
          <h1 className="mt-4 text-lg font-bold text-gray-900">ご予約が見つかりません</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            お探しのご予約が見つかりませんでした。
            URLが正しいかご確認のうえ、もう一度お試しください。
          </p>
        </div>
      </div>
    );
  }

  const { store, service, staff, customer } = reservation;
  const now = new Date();
  const isFuture = reservation.startAt > now;
  const cancellable =
    isFuture &&
    (reservation.status === "PENDING" || reservation.status === "CONFIRMED");
  const reservationNo = token.slice(0, 8).toUpperCase();
  // 24時間を切っているご予約は、店舗側の準備に影響するためお電話での連絡もご案内する
  const withinOneDay =
    isFuture && reservation.startAt.getTime() - now.getTime() < 24 * 60 * 60 * 1000;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-1.5 bg-brand" />
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-md items-center justify-center px-4">
          <span className="truncate text-base font-bold text-gray-900">{store.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-gray-900">ご予約内容</h1>
          <Badge className={cn("shrink-0", RESERVATION_STATUS_COLORS[reservation.status])}>
            {RESERVATION_STATUS_LABELS[reservation.status]}
          </Badge>
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="rounded-lg bg-brand-light/60 px-4 py-3 text-center">
              <p className="text-[10px] font-medium tracking-wide text-gray-500">予約番号</p>
              <p className="mt-0.5 font-mono text-xl font-bold tracking-[0.2em] text-brand-dark">
                {reservationNo}
              </p>
            </div>
            <dl className="mt-3 divide-y divide-gray-100">
              <DetailRow
                label="日時"
                value={
                  <span className="flex items-center justify-end gap-1.5 font-bold">
                    <Clock aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                    {formatJstDateTime(reservation.startAt)}
                  </span>
                }
              />
              <DetailRow label="メニュー" value={service?.name ?? "—"} />
              <DetailRow label="担当" value={staff?.name ?? "指名なし"} />
              <DetailRow label="料金" value={formatYen(reservation.price)} />
              <DetailRow label="お名前" value={`${customer.name} 様`} />
              {reservation.note && (
                <DetailRow
                  label="ご要望・メモ"
                  value={<span className="whitespace-pre-wrap">{reservation.note}</span>}
                />
              )}
            </dl>
          </CardContent>
        </Card>

        {reservation.status === "PENDING" && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              このご予約は店舗による確認後に確定します。
              確定までしばらくお待ちください。
            </p>
          </div>
        )}

        {reservation.status === "CANCELLED" && (
          <div className="mt-6 text-center">
            <p className="text-sm leading-relaxed text-gray-600">
              このご予約はキャンセルされました。
              <br />
              またのご予約を心よりお待ちしております。
            </p>
            <Link
              href={`/r/${store.slug}`}
              className={cn(buttonVariants({ size: "lg" }), "mt-5 w-full")}
            >
              <CalendarPlus aria-hidden="true" />
              新しく予約する
            </Link>
          </div>
        )}

        {reservation.status === "COMPLETED" && (
          <div className="mt-6 flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light">
              <Heart aria-hidden="true" className="h-6 w-6 text-brand" />
            </div>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              ご来店ありがとうございました。
              <br />
              またのお越しを心よりお待ちしております。
            </p>
            <Link
              href={`/r/${store.slug}`}
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-5 w-full")}
            >
              <CalendarPlus aria-hidden="true" />
              次回のご予約はこちら
            </Link>
          </div>
        )}

        {cancellable && (
          <section
            aria-labelledby="cancel-title"
            className="mt-10 rounded-xl border border-gray-200 bg-white p-5"
          >
            <h2 id="cancel-title" className="text-sm font-bold text-gray-900">
              ご都合が変わった場合
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
              日時の変更をご希望の場合は、いったんキャンセルのうえ、あらためてご予約ください。
            </p>

            {withinOneDay && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
                <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  ご予約のお時間が24時間を切っています。
                  お急ぎの場合は、キャンセルとあわせて店舗へお電話でご連絡いただけますと助かります。
                </p>
              </div>
            )}

            <div className="mt-4">
              <CancelSection token={token} />
            </div>

            {store.phone && (
              <a
                href={`tel:${store.phone.replace(/[^0-9+]/g, "")}`}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "mt-3 h-11 w-full text-sm text-gray-600"
                )}
              >
                <Phone aria-hidden="true" />
                店舗へ電話する（{store.phone}）
              </a>
            )}
          </section>
        )}

        {!cancellable &&
          reservation.status !== "CANCELLED" &&
          reservation.status !== "COMPLETED" &&
          !isFuture && (
            <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 text-center">
              <p className="text-sm font-medium text-gray-700">
                こちらのご予約日時は終了しています
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
                この画面からのキャンセルはできません。ご不明な点は店舗までお問い合わせください。
              </p>
              <Link
                href={`/r/${store.slug}`}
                className={cn(buttonVariants({ variant: "outline" }), "mt-4 h-11 w-full")}
              >
                <CalendarPlus aria-hidden="true" />
                新しく予約する
              </Link>
            </div>
          )}
      </main>

      <footer className="pb-10 pt-2 text-center text-xs text-gray-400">{store.name}</footer>
    </div>
  );
}
