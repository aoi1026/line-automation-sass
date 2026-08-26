import type { Metadata } from "next";
import { CalendarX2, MapPin, Phone } from "lucide-react";
import { prisma } from "@/lib/db";
import { resolveBusinessHours } from "@/app/api/public/booking/[slug]/shared";
import { getHolidayYmds } from "@/lib/holidays";
import {
  DAY_LABELS_JA,
  addDays,
  fromJst,
  jstDayKey,
  jstParts,
  jstYmd,
} from "@/lib/jst";
import { BookingFlow, type DateOption } from "./booking-flow";

export const dynamic = "force-dynamic";

/**
 * 店舗ごとのWeb予約ページ。お客様が検索から到達できるよう検索エンジンへの登録を許可する。
 * （個人情報を含むトークンページ /v /s /c とは異なり、公開情報のみを扱う）
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const store = await prisma.store.findUnique({
    where: { slug },
    select: { name: true, description: true, address: true },
  });

  if (!store) {
    return { title: "ご予約", robots: { index: false, follow: false } };
  }

  const title = `${store.name} ご予約`;
  const description =
    store.description.trim() ||
    `${store.name}のWeb予約ページです。${
      store.address.trim() ? `${store.address}／` : ""
    }ご希望の日時とメニューを選んで、24時間いつでもご予約いただけます。`;

  return {
    title,
    description,
    alternates: { canonical: `/r/${slug}` },
    openGraph: {
      type: "website",
      locale: "ja_JP",
      siteName: store.name,
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const store = await prisma.store.findUnique({ where: { slug } });

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-20">
        <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <CalendarX2 aria-hidden="true" className="mx-auto h-12 w-12 text-gray-300" />
          <h1 className="mt-4 text-lg font-bold text-gray-900">
            予約ページが見つかりません
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            お探しの店舗の予約ページが見つかりませんでした。
            URLが正しいかご確認のうえ、もう一度お試しください。
          </p>
        </div>
      </div>
    );
  }

  // 今日から30日分（JST）の臨時休業日を先に取得しておく
  const now = new Date();
  const rangeStart = fromJst(jstYmd(now));
  const rangeEnd = fromJst(jstYmd(addDays(now, 29)));

  const [services, staff, holidayYmds] = await Promise.all([
    prisma.service.findMany({
      where: { storeId: store.id, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        durationMin: true,
        price: true,
      },
    }),
    prisma.staffMember.findMany({
      where: { storeId: store.id, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, title: true },
    }),
    getHolidayYmds(store.id, rangeStart, rangeEnd),
  ]);

  // 今日から30日分の日付候補（JST・定休日と臨時休業日は選択不可）
  const businessHours = resolveBusinessHours(store.businessHours);
  const holidaySet = new Set(holidayYmds);
  const dates: DateOption[] = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(now, i);
    const dayKey = jstDayKey(d);
    const { month, day } = jstParts(d);
    const ymd = jstYmd(d);
    const holiday = holidaySet.has(ymd);
    return {
      ymd,
      md: `${month}/${day}`,
      dow: DAY_LABELS_JA[dayKey],
      dayKey,
      closed: businessHours[dayKey].closed || holiday,
      holiday,
      isToday: i === 0,
    };
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-1.5 bg-brand" />
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-md px-4 pb-5 pt-6">
          <p className="text-xs font-semibold tracking-wide text-brand">
            ネット予約受付中
          </p>
          <h1 className="mt-1 text-balance text-xl font-bold text-gray-900">{store.name}</h1>
          {store.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
              {store.description}
            </p>
          )}
          {(store.address || store.phone) && (
            <div className="mt-3 flex flex-col gap-1 text-xs text-gray-500">
              {store.address && (
                <span className="flex items-start gap-1.5">
                  <MapPin aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="break-words">{store.address}</span>
                </span>
              )}
              {store.phone && (
                <a
                  href={`tel:${store.phone.replace(/[^0-9+]/g, "")}`}
                  className="-ml-1 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-1 transition-colors hover:text-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                >
                  <Phone aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="break-words">{store.phone}</span>
                  <span className="sr-only">（タップで電話をかけられます）</span>
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-6">
        <BookingFlow
          slug={store.slug}
          storeName={store.name}
          services={services}
          staff={staff}
          dates={dates}
        />
      </main>

      <footer className="pb-10 pt-4 text-center text-xs text-gray-400">
        {store.name}
      </footer>
    </div>
  );
}
